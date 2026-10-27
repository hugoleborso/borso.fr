import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  bootstrapSharedPassword,
  createMemberDirectly,
  extractSessionCookie,
  giveMemberCredentials,
  jsonRequest,
  lambdaEnvironmentFrom,
  loginAsMember,
  readJson,
  SESSION_COOKIE_NAME,
  TEST_HOST,
  TEST_PASSWORD,
} from '../../../test/auth-utils';
import {
  abortCommitsWritingTable,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { createApp } from '../app';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { deleteMemberWithLinks } from '../members/members.repository';
import {
  assistantAuthorizationCodeTable,
  assistantClientTable,
  assistantGrantTable,
} from './oauth.schema';

const ISSUER = 'https://pragma.test';
const CONSENT_ORIGIN = 'https://site.pragma.test';
const RFC_7636_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_7636_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const CLAUDE_CODE_CALLBACK = 'http://localhost:47823/callback';
const STATE = 'opaque-state';
const OTHER_CLIENT_ADDRESS = '198.51.100.9';
const REGISTRATIONS_PER_HOUR = 10;
const CODE_LIFETIME_MS = 60_000;
const DAYS_BEFORE_SWEEP = 31;
const MILLISECONDS_PER_DAY = 86_400_000;
const PRESERVED_ENVIRONMENT = {
  issuer: process.env.OAUTH_ISSUER,
  consentOrigin: process.env.OAUTH_CONSENT_ORIGIN,
};

const CLAUDE_CODE_REGISTRATION = {
  client_name: 'Claude Code (pragma)',
  redirect_uris: [CLAUDE_CODE_CALLBACK],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
};
const VIBE_REGISTRATION = {
  client_name: 'Mistral Vibe',
  redirect_uris: ['http://127.0.0.1:8765/callback'],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
  scope: 'pragma',
};

const registeredClientSchema = z.object({
  client_id: z.string().uuid(),
  client_id_issued_at: z.number().int(),
  client_name: z.string(),
  redirect_uris: z.array(z.string()),
  token_endpoint_auth_method: z.literal('none'),
});
const tokenSchema = z.object({
  access_token: z.string().min(40),
  token_type: z.literal('Bearer'),
  expires_in: z.literal(3_600),
  refresh_token: z.string().min(40),
  scope: z.literal('pragma'),
});
const errorSchema = z.object({ error: z.string() });
const redirectToSchema = z.object({ redirectTo: z.string().url() });
const consentDescriptionSchema = z.object({ clientName: z.string(), memberFirstName: z.string() });
const grantsSchema = z.object({
  grants: z.array(
    z.object({
      id: z.string().uuid(),
      clientName: z.string(),
      createdAt: z.string(),
      lastUsedAt: z.string().nullable(),
    }),
  ),
});
const productEventSchema = z.object({ event: z.string() }).passthrough();

interface SignedInMember {
  readonly memberId: string;
  readonly cookieHeader: string;
}

interface Harness {
  readonly app: Hono;
  readonly reportFailure: ReturnType<typeof vi.fn<(failure: TaggedFailure) => void>>;
  readonly clock: { now: Date };
}

const usernameSequence = { next: 0 };

function restoreVariable(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function buildHarness(): Harness {
  const clock = { now: new Date() };
  const reportFailure = vi.fn<(failure: TaggedFailure) => void>();
  const app = createApp({ oauth: { clock: () => clock.now, reportFailure } });
  return { app, reportFailure, clock };
}

async function signInMember(app: Hono, firstName: string): Promise<SignedInMember> {
  await bootstrapSharedPassword(app);
  const memberId = await createMemberDirectly(app, firstName);
  usernameSequence.next += 1;
  const username = `assistant${String(usernameSequence.next)}`;
  await giveMemberCredentials({ memberId, username });
  const value = extractSessionCookie(await loginAsMember(app, username));
  if (value === null) throw new Error('signing in did not return a session cookie');
  return { memberId, cookieHeader: `${SESSION_COOKIE_NAME}=${value}` };
}

async function postForm(
  app: Hono,
  path: string,
  fields: Readonly<Record<string, string>>,
): Promise<Response> {
  return app.request(
    `${TEST_HOST}${path}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    },
    lambdaEnvironmentFrom(OTHER_CLIENT_ADDRESS),
  );
}

async function register(
  app: Hono,
  body: unknown = CLAUDE_CODE_REGISTRATION,
  clientAddress?: string,
): Promise<Response> {
  return jsonRequest(app, '/oauth/register', {
    method: 'POST',
    body,
    ...(clientAddress === undefined ? {} : { clientAddress }),
  });
}

async function registerClient(app: Hono): Promise<string> {
  const registered = await readJson(await register(app), registeredClientSchema);
  return registered.client_id;
}

function authorizationQuery(clientId: string, overrides: Record<string, string> = {}): string {
  return new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CLAUDE_CODE_CALLBACK,
    code_challenge: RFC_7636_CHALLENGE,
    code_challenge_method: 'S256',
    state: STATE,
    ...overrides,
  }).toString();
}

function consentBody(clientId: string, decision: 'allow' | 'deny') {
  return {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CLAUDE_CODE_CALLBACK,
    code_challenge: RFC_7636_CHALLENGE,
    code_challenge_method: 'S256',
    state: STATE,
    decision,
  };
}

async function obtainCode(app: Hono, clientId: string, member: SignedInMember): Promise<string> {
  const response = await jsonRequest(app, '/api/oauth/consent', {
    method: 'POST',
    body: consentBody(clientId, 'allow'),
    cookieHeader: member.cookieHeader,
  });
  const { redirectTo } = await readJson(response, redirectToSchema);
  const code = new URL(redirectTo).searchParams.get('code');
  if (code === null) throw new Error(`consent did not answer a code: ${redirectTo}`);
  return code;
}

async function exchangeCode(app: Hono, clientId: string, code: string): Promise<Response> {
  return postForm(app, '/oauth/token', {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: CLAUDE_CODE_CALLBACK,
    code_verifier: RFC_7636_VERIFIER,
  });
}

async function refresh(app: Hono, clientId: string, refreshToken: string): Promise<Response> {
  return postForm(app, '/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });
}

async function issueTokens(app: Hono, clientId: string, member: SignedInMember) {
  const code = await obtainCode(app, clientId, member);
  return await readJson(await exchangeCode(app, clientId, code), tokenSchema);
}

async function countGrants(): Promise<number> {
  const rows = await testDatabase()
    .select({ id: assistantGrantTable.id })
    .from(assistantGrantTable);
  return rows.length;
}

function byAscendingNumber(left: number, right: number): number {
  return left - right;
}

function recordedProductEvents(stdoutWrite: { mock: { calls: unknown[][] } }): string[] {
  return stdoutWrite.mock.calls.flatMap(([chunk]) => {
    if (typeof chunk !== 'string') return [];
    const productEvent = productEventSchema.safeParse(JSON.parse(chunk));
    return productEvent.success ? [productEvent.data.event] : [];
  });
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('oauth controller (back-e2e)', () => {
  beforeAll(() => {
    process.env.OAUTH_ISSUER = ISSUER;
    process.env.OAUTH_CONSENT_ORIGIN = CONSENT_ORIGIN;
  });

  afterAll(() => {
    restoreVariable('OAUTH_ISSUER', PRESERVED_ENVIRONMENT.issuer);
    restoreVariable('OAUTH_CONSENT_ORIGIN', PRESERVED_ENVIRONMENT.consentOrigin);
  });

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes the authorization server and protected resource metadata, path-suffixed form included', async () => {
    const { app } = buildHarness();

    const server = await readJson(
      await jsonRequest(app, '/.well-known/oauth-authorization-server'),
      z.object({
        issuer: z.literal(ISSUER),
        token_endpoint: z.literal(`${ISSUER}/oauth/token`),
        code_challenge_methods_supported: z.tuple([z.literal('S256')]),
      }),
    );
    const resourceSchema = z.object({
      resource: z.literal(`${ISSUER}/mcp`),
      authorization_servers: z.tuple([z.literal(ISSUER)]),
    });
    const resource = await readJson(
      await jsonRequest(app, '/.well-known/oauth-protected-resource'),
      resourceSchema,
    );
    const suffixed = await readJson(
      await jsonRequest(app, '/.well-known/oauth-protected-resource/mcp'),
      resourceSchema,
    );

    expect(server.issuer).toBe(ISSUER);
    expect(suffixed).toEqual(resource);
  });

  it('registers the clients Claude Code and Vibe describe, and refuses any other redirect address', async () => {
    const { app } = buildHarness();
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const claudeCode = await register(app, CLAUDE_CODE_REGISTRATION);
    const vibe = await register(app, VIBE_REGISTRATION);
    const offLoopback = await register(app, { redirect_uris: ['http://example.com/cb'] });
    const malformed = await register(app, { redirect_uris: 'nope' });

    expect(claudeCode.status).toBe(201);
    expect((await readJson(claudeCode, registeredClientSchema)).client_name).toBe(
      'Claude Code (pragma)',
    );
    expect(vibe.status).toBe(201);
    expect(offLoopback.status).toBe(400);
    expect(await readJson(offLoopback, errorSchema)).toEqual({ error: 'invalid_redirect_uri' });
    expect(malformed.status).toBe(400);
    expect(await readJson(malformed, errorSchema)).toEqual({ error: 'invalid_client_metadata' });
    expect(recordedProductEvents(stdoutWrite)).toEqual([
      'assistant_client_registered',
      'assistant_client_registered',
    ]);
  });

  it('refuses the eleventh registration in an hour from one address and reports it', async () => {
    const { app, reportFailure } = buildHarness();

    for (let attempt = 0; attempt < REGISTRATIONS_PER_HOUR; attempt += 1) {
      expect((await register(app)).status).toBe(201);
    }
    const refused = await register(app);
    const fromElsewhere = await register(app, CLAUDE_CODE_REGISTRATION, OTHER_CLIENT_ADDRESS);

    expect(refused.status).toBe(429);
    expect(reportFailure).toHaveBeenCalledWith({ name: 'OAuthRegistrationRateLimited', tags: {} });
    expect(fromElsewhere.status).toBe(201);
  });

  it('sweeps clients older than 30 days that hold no grant when another registers', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const longAgo = new Date(Date.now() - DAYS_BEFORE_SWEEP * MILLISECONDS_PER_DAY);
    const keptClientId = await registerClient(app);
    await issueTokens(app, keptClientId, member);
    await testDatabase()
      .update(assistantClientTable)
      .set({ createdAt: longAgo })
      .where(eq(assistantClientTable.id, keptClientId));
    await testDatabase()
      .insert(assistantClientTable)
      .values({
        id: 'abandoned-client',
        name: 'Abandoned',
        redirectUris: JSON.stringify([CLAUDE_CODE_CALLBACK]),
        createdAt: longAgo,
      });

    await registerClient(app);

    const remaining = await testDatabase()
      .select({ id: assistantClientTable.id })
      .from(assistantClientTable);
    expect(remaining.map((row) => row.id)).toContain(keptClientId);
    expect(remaining.map((row) => row.id)).not.toContain('abandoned-client');
  });

  it('never redirects an unknown client or an unregistered address, and redirects other faults back', async () => {
    const { app } = buildHarness();
    const clientId = await registerClient(app);

    const unknownClient = await jsonRequest(
      app,
      `/oauth/authorize?${authorizationQuery('00000000-0000-4000-8000-000000000000')}`,
    );
    const unregistered = await jsonRequest(
      app,
      `/oauth/authorize?${authorizationQuery(clientId, { redirect_uri: 'https://evil.example/cb' })}`,
    );
    const plain = await jsonRequest(
      app,
      `/oauth/authorize?${authorizationQuery(clientId, { code_challenge_method: 'plain' })}`,
    );

    expect(unknownClient.status).toBe(400);
    expect(unknownClient.headers.get('location')).toBeNull();
    expect(unregistered.status).toBe(400);
    expect(unregistered.headers.get('location')).toBeNull();
    expect(plain.status).toBe(302);
    expect(plain.headers.get('location')).toBe(
      `${CLAUDE_CODE_CALLBACK}?error=invalid_request&state=${STATE}`,
    );
  });

  it('sends a valid request to the site consent page with the whole query', async () => {
    const { app } = buildHarness();
    const clientId = await registerClient(app);
    const query = authorizationQuery(clientId, { redirect_uri: 'http://localhost:51000/callback' });

    const response = await jsonRequest(app, `/oauth/authorize?${query}`);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${CONSENT_ORIGIN}/oauth/consent?${query}`);
  });

  it('gates the consent routes on the member session cookie', async () => {
    const { app } = buildHarness();
    await bootstrapSharedPassword(app);
    const clientId = await registerClient(app);

    const described = await jsonRequest(app, `/api/oauth/consent?${authorizationQuery(clientId)}`);
    const decided = await jsonRequest(app, '/api/oauth/consent', {
      method: 'POST',
      body: consentBody(clientId, 'allow'),
    });

    expect(described.status).toBe(401);
    expect(decided.status).toBe(401);
  });

  it('runs the whole flow: consent, code, tokens, and the code cannot be spent twice', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const description = await readJson(
      await jsonRequest(app, `/api/oauth/consent?${authorizationQuery(clientId)}`, {
        cookieHeader: member.cookieHeader,
      }),
      consentDescriptionSchema,
    );
    const code = await obtainCode(app, clientId, member);
    const exchanged = await exchangeCode(app, clientId, code);
    const tokens = await readJson(exchanged, tokenSchema);
    const spentAgain = await exchangeCode(app, clientId, code);

    expect(description).toEqual({
      clientName: 'Claude Code (pragma)',
      memberFirstName: 'Hugo',
    });
    expect(exchanged.headers.get('cache-control')).toBe('no-store');
    expect(spentAgain.status).toBe(400);
    expect(await readJson(spentAgain, errorSchema)).toEqual({ error: 'invalid_grant' });
    const grants = await testDatabase().select().from(assistantGrantTable);
    expect(grants).toHaveLength(1);
    expect(grants[0]?.memberId).toBe(member.memberId);
    const storedValues = JSON.stringify(grants);
    expect(storedValues).not.toContain(tokens.access_token);
    expect(storedValues).not.toContain(tokens.refresh_token);
    expect(storedValues).not.toContain(code);
    expect(recordedProductEvents(stdoutWrite)).toEqual(['assistant_grant_created']);
  });

  it('refuses a consent request that does not hold together, even with a session', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);

    const described = await jsonRequest(
      app,
      `/api/oauth/consent?${authorizationQuery(clientId, { code_challenge_method: 'plain' })}`,
      { cookieHeader: member.cookieHeader },
    );
    const decided = await jsonRequest(app, '/api/oauth/consent', {
      method: 'POST',
      body: { ...consentBody(clientId, 'allow'), redirect_uri: 'https://evil.example/cb' },
      cookieHeader: member.cookieHeader,
    });

    expect(described.status).toBe(400);
    expect(decided.status).toBe(400);
    expect(await readJson(decided, errorSchema)).toEqual({
      error: 'invalid-authorization-request',
    });
  });

  it('answers access_denied with the original state when the member denies', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);

    const response = await jsonRequest(app, '/api/oauth/consent', {
      method: 'POST',
      body: consentBody(clientId, 'deny'),
      cookieHeader: member.cookieHeader,
    });

    expect(await readJson(response, redirectToSchema)).toEqual({
      redirectTo: `${CLAUDE_CODE_CALLBACK}?error=access_denied&state=${STATE}`,
    });
    expect(await countGrants()).toBe(0);
  });

  it('refuses a wrong verifier, an expired code and an unsupported grant type', async () => {
    const { app, clock } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);

    const wrongVerifier = await postForm(app, '/oauth/token', {
      grant_type: 'authorization_code',
      code: await obtainCode(app, clientId, member),
      client_id: clientId,
      redirect_uri: CLAUDE_CODE_CALLBACK,
      code_verifier: 'x'.repeat(RFC_7636_VERIFIER.length),
    });
    const expiringCode = await obtainCode(app, clientId, member);
    clock.now = new Date(clock.now.getTime() + CODE_LIFETIME_MS);
    const expired = await exchangeCode(app, clientId, expiringCode);
    const unsupported = await postForm(app, '/oauth/token', { grant_type: 'password' });
    const malformed = await postForm(app, '/oauth/token', {});

    expect(await readJson(wrongVerifier, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await readJson(expired, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await readJson(unsupported, errorSchema)).toEqual({ error: 'unsupported_grant_type' });
    expect(await readJson(malformed, errorSchema)).toEqual({ error: 'invalid_request' });
    expect(await countGrants()).toBe(0);
  });

  it('rotates the refresh token, and a replay of the old one revokes the grant and is reported', async () => {
    const { app, reportFailure } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const first = await issueTokens(app, clientId, member);

    const rotated = await readJson(await refresh(app, clientId, first.refresh_token), tokenSchema);
    const replayed = await refresh(app, clientId, first.refresh_token);
    const afterReplay = await refresh(app, clientId, rotated.refresh_token);

    expect(rotated.refresh_token).not.toBe(first.refresh_token);
    expect(rotated.access_token).not.toBe(first.access_token);
    expect(await readJson(replayed, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await readJson(afterReplay, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await countGrants()).toBe(0);
    expect(reportFailure).toHaveBeenCalledWith({
      name: 'OAuthTokenReplay',
      tags: { 'oauth.client': clientId },
    });
  });

  it('revokes the grant when a token two rotations old is replayed after a thief refreshed twice', async () => {
    const { app, reportFailure } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const stolen = await issueTokens(app, clientId, member);

    const second = await readJson(await refresh(app, clientId, stolen.refresh_token), tokenSchema);
    const third = await readJson(await refresh(app, clientId, second.refresh_token), tokenSchema);
    const replayed = await refresh(app, clientId, stolen.refresh_token);
    const thiefRefresh = await refresh(app, clientId, third.refresh_token);

    expect(await readJson(replayed, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await readJson(thiefRefresh, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await countGrants()).toBe(0);
    expect(reportFailure).toHaveBeenCalledWith({
      name: 'OAuthTokenReplay',
      tags: { 'oauth.client': clientId },
    });
  });

  it('spends a code once when two exchanges race, with no server error', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const code = await obtainCode(app, clientId, member);

    const answers = await Promise.all([
      exchangeCode(app, clientId, code),
      exchangeCode(app, clientId, code),
    ]);

    expect(answers.map((answer) => answer.status).toSorted(byAscendingNumber)).toEqual([200, 400]);
    expect(await countGrants()).toBe(1);
  });

  it('answers invalid_grant, never a 500, when the code claim loses a commit conflict', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const code = await obtainCode(app, clientId, member);
    const removeSimulatedConflict = await abortCommitsWritingTable(
      'assistant_authorization_code',
      1,
    );
    try {
      const response = await exchangeCode(app, clientId, code);

      expect(response.status).toBe(400);
      expect(await readJson(response, errorSchema)).toEqual({ error: 'invalid_grant' });
      expect(await countGrants()).toBe(0);
    } finally {
      await removeSimulatedConflict();
    }
  });

  it('rotates a refresh token once when two refreshes race, with no server error', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const tokens = await issueTokens(app, clientId, member);

    const answers = await Promise.all([
      refresh(app, clientId, tokens.refresh_token),
      refresh(app, clientId, tokens.refresh_token),
    ]);

    expect(answers.map((answer) => answer.status).toSorted(byAscendingNumber)).toEqual([200, 400]);
  });

  it('answers invalid_grant, never a 500, when the rotation loses a commit conflict', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const tokens = await issueTokens(app, clientId, member);
    const removeSimulatedConflict = await abortCommitsWritingTable('assistant_grant', 1);
    try {
      const response = await refresh(app, clientId, tokens.refresh_token);

      expect(response.status).toBe(400);
      expect(await readJson(response, errorSchema)).toEqual({ error: 'invalid_grant' });
      expect(await countGrants()).toBe(1);
    } finally {
      await removeSimulatedConflict();
    }
  });

  it('refuses a refresh presented by another client without revoking the grant', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const otherClientId = await registerClient(app);
    const tokens = await issueTokens(app, clientId, member);

    const response = await refresh(app, otherClientId, tokens.refresh_token);

    expect(await readJson(response, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await countGrants()).toBe(1);
  });

  it('ends every grant of a member who changes password', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const tokens = await issueTokens(app, clientId, member);

    const changed = await jsonRequest(app, '/api/me/password', {
      method: 'PUT',
      body: { currentPassword: TEST_PASSWORD, newPassword: 'another-horse-battery' },
      cookieHeader: member.cookieHeader,
    });
    const response = await refresh(app, clientId, tokens.refresh_token);

    expect(changed.status).toBe(200);
    expect(await readJson(response, errorSchema)).toEqual({ error: 'invalid_grant' });
    expect(await countGrants()).toBe(0);
  });

  it('revokes a grant for a client that presents its token, and answers 200 for an unknown one', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    const tokens = await issueTokens(app, clientId, member);
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const revoked = await postForm(app, '/oauth/revoke', { token: tokens.access_token });
    const unknown = await postForm(app, '/oauth/revoke', { token: 'never-issued' });
    const malformed = await postForm(app, '/oauth/revoke', {});

    expect(revoked.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(malformed.status).toBe(400);
    expect(await countGrants()).toBe(0);
    expect(recordedProductEvents(stdoutWrite)).toEqual(['assistant_grant_revoked']);
    expect(await readJson(await refresh(app, clientId, tokens.refresh_token), errorSchema)).toEqual(
      { error: 'invalid_grant' },
    );
  });

  it("lists a member's own grants and revokes one from the Account page, never another member's", async () => {
    const { app } = buildHarness();
    const owner = await signInMember(app, 'Hugo');
    const other = await signInMember(app, 'Léa');
    const clientId = await registerClient(app);
    await issueTokens(app, clientId, owner);

    const unauthenticated = await jsonRequest(app, '/api/assistant-grants');
    const listed = await readJson(
      await jsonRequest(app, '/api/assistant-grants', { cookieHeader: owner.cookieHeader }),
      grantsSchema,
    );
    const seenByOther = await readJson(
      await jsonRequest(app, '/api/assistant-grants', { cookieHeader: other.cookieHeader }),
      grantsSchema,
    );
    const grantId = listed.grants[0]?.id ?? '';
    const deletedByOther = await jsonRequest(app, `/api/assistant-grants/${grantId}`, {
      method: 'DELETE',
      cookieHeader: other.cookieHeader,
    });
    const deletedByOwner = await jsonRequest(app, `/api/assistant-grants/${grantId}`, {
      method: 'DELETE',
      cookieHeader: owner.cookieHeader,
    });

    expect(unauthenticated.status).toBe(401);
    expect(listed.grants).toEqual([
      expect.objectContaining({ clientName: 'Claude Code (pragma)', lastUsedAt: null }),
    ]);
    expect(seenByOther.grants).toEqual([]);
    expect(deletedByOther.status).toBe(404);
    expect(await readJson(deletedByOther, errorSchema)).toEqual({
      error: 'assistant-grant-not-found',
    });
    expect(deletedByOwner.status).toBe(200);
    expect(await countGrants()).toBe(0);
  });

  it('deletes the grants and pending codes of a deleted member', async () => {
    const { app } = buildHarness();
    const member = await signInMember(app, 'Hugo');
    const clientId = await registerClient(app);
    await issueTokens(app, clientId, member);
    await obtainCode(app, clientId, member);

    await deleteMemberWithLinks(member.memberId);

    expect(await countGrants()).toBe(0);
    const codes = await testDatabase()
      .select({ codeHash: assistantAuthorizationCodeTable.codeHash })
      .from(assistantAuthorizationCodeTable);
    expect(codes).toEqual([]);
  });
});
