import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type AuthenticatedApp,
  bootstrapSharedPassword,
  createMemberDirectly,
  extractSessionCookie,
  giveMemberCredentials,
  jsonRequest,
  loginAsMember,
  readJson,
  recoverPassword,
  SESSION_COOKIE_NAME,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantHarness,
  buildAssistantHarness,
  callTool,
  connectAssistant,
  MCP_TEST_ISSUER,
  openMcpClient,
  postToMcp,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { assistantGrantTable } from '../oauth/oauth.schema';

const ASSISTANT_USERNAME = 'assistant-owner';
const ONE_HOUR_MS = 3_600_000;
const FOUR_MINUTES_MS = 240_000;
const FIVE_MINUTES_MS = 300_000;
const EXPECTED_CHALLENGE = `Bearer resource_metadata="${MCP_TEST_ISSUER}/.well-known/oauth-protected-resource/mcp"`;
const SERVED_TOOLS = [
  'search_songs',
  'search_deezer',
  'get_song',
  'create_song',
  'update_song',
  'set_default_lineup',
  'delete_song',
  'list_transition_comments',
  'get_transition_comment',
  'set_transition_comment',
  'delete_transition_comment',
  'list_sessions',
  'get_session',
  'create_session',
  'update_session',
  'delete_session',
  'list_setlists',
  'list_session_setlists',
  'get_setlist',
  'create_setlist',
  'update_setlist',
  'delete_setlist',
  'link_setlist_to_session',
  'unlink_setlist_from_session',
  'list_setlist_entries',
  'add_setlist_entry',
  'update_setlist_entry',
  'set_entry_lineup',
  'remove_setlist_entry',
  'move_setlist_entry',
  'get_vote_board',
  'set_vote_status',
  'cast_vote',
  'get_closing_proposal',
  'close_vote',
  'list_takes',
  'list_take_comments',
  'request_take_upload',
  'create_take',
  'delete_take',
  'comment_on_take',
  'update_take_comment',
  'delete_take_comment',
  'list_tasks',
  'create_task',
  'update_task',
  'delete_task',
  'list_improvements',
  'create_improvement',
  'update_improvement',
  'delete_improvement',
  'vote_for_improvement',
  'withdraw_improvement_vote',
  'list_bars',
  'search_bar_places',
  'get_bar',
  'create_bar',
  'update_bar',
  'delete_bar',
  'get_outreach_template',
  'save_outreach_template',
  'list_free_slots',
  'get_studies_overview',
  'log_study',
  'undo_study',
  'list_mastery_defaults',
  'set_mastery_default',
  'delete_mastery_default',
  'list_mastery_overrides',
  'get_mastery_history',
  'set_mastery_override',
  'delete_mastery_override',
  'list_members',
  'create_member',
  'update_member',
  'delete_member',
  'list_member_instruments',
  'set_member_instruments',
  'list_instruments',
  'create_instrument',
  'reorder_instruments',
  'update_instrument',
  'delete_instrument',
  'get_me',
  'update_my_contact',
  'get_notification_preferences',
  'set_notification_preference',
];
const INITIALIZE_MESSAGE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'curl', version: '1' },
  },
};

const errorSchema = z.object({ error: z.string() });
const grantsSchema = z.object({ grants: z.array(z.object({ id: z.string().uuid() })) });
const songsSchema = z.object({ songs: z.array(z.object({ title: z.string() })) });

async function signInOwner(harness: AssistantHarness): Promise<AuthenticatedApp> {
  await bootstrapSharedPassword(harness.app);
  const memberId = await createMemberDirectly(harness.app, 'Hugo');
  await giveMemberCredentials({ memberId, username: ASSISTANT_USERNAME });
  const cookie = extractSessionCookie(await loginAsMember(harness.app, ASSISTANT_USERNAME));
  if (cookie === null) throw new Error('signing in did not return a session cookie');
  return { app: harness.app, memberId, cookieHeader: `${SESSION_COOKIE_NAME}=${cookie}` };
}

async function readLastUsedAt(memberId: string): Promise<Date | null> {
  const rows = await testDatabase()
    .select({ lastUsedAt: assistantGrantTable.lastUsedAt })
    .from(assistantGrantTable)
    .where(eq(assistantGrantTable.memberId, memberId));
  return rows[0]?.lastUsedAt ?? null;
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('mcp controller (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers 401 with the protected resource metadata address to a call without a valid token', async () => {
    const { app } = buildAssistantHarness();

    const anonymous = await postToMcp(app, INITIALIZE_MESSAGE);
    const unknownToken = await postToMcp(app, INITIALIZE_MESSAGE, 'Bearer not-a-real-token');
    const otherScheme = await postToMcp(app, INITIALIZE_MESSAGE, 'Basic dXNlcjpwYXNz');

    for (const refused of [anonymous, unknownToken, otherScheme]) {
      expect(refused.status).toBe(401);
      expect(refused.headers.get('www-authenticate')).toBe(EXPECTED_CHALLENGE);
      expect(await readJson(refused, errorSchema)).toEqual({ error: 'invalid_token' });
    }
  });

  it('refuses GET and DELETE, since the server keeps no stream and no session', async () => {
    const { app } = buildAssistantHarness();

    const opened = await app.request('http://localhost/mcp', { method: 'GET' });
    const closed = await app.request('http://localhost/mcp', { method: 'DELETE' });

    expect(opened.status).toBe(405);
    expect(closed.status).toBe(405);
    expect(opened.headers.get('allow')).toBe('POST');
  });

  it('lists every served tool, advertises tools only, and serves two clients at once with no session', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);
    const sessionHeaders: (string | null)[] = [];
    const observe = (response: Response) => {
      sessionHeaders.push(response.headers.get('mcp-session-id'));
    };

    const [first, second] = await Promise.all([
      openMcpClient(harness.app, tokens.accessToken, observe),
      openMcpClient(harness.app, tokens.accessToken, observe),
    ]);
    const { tools } = await first.listTools();
    const [created, listed] = await Promise.all([
      callTool(first, 'create_song', { title: 'Creep', status: 'idea' }),
      callTool(second, 'search_songs'),
    ]);

    expect(tools.map((tool) => tool.name)).toEqual(SERVED_TOOLS);
    expect(Object.keys(first.getServerCapabilities() ?? {})).toEqual(['tools']);
    expect(created.isError).toBe(false);
    expect(listed.isError).toBe(false);
    expect(songsSchema.parse((await callTool(second, 'search_songs')).body).songs).toEqual([
      expect.objectContaining({ title: 'Creep' }),
    ]);
    expect(sessionHeaders.length).toBeGreaterThan(0);
    expect(sessionHeaders.every((header) => header === null)).toBe(true);
  });

  it('answers an argument the schema refuses with an error naming the field, never a 500', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);
    const client = await openMcpClient(harness.app, tokens.accessToken);

    const refusal = await callTool(client, 'create_song', { status: 'idea' });
    const unknownTool = await callTool(client, 'add_song', { title: 'Creep' });

    expect(refusal.isError).toBe(true);
    expect(String(refusal.body)).toContain('title');
    expect(unknownTool.isError).toBe(true);
    expect(String(unknownTool.body)).toContain('add_song');
  });

  it('stops answering once the member revokes the grant on the Account page', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);
    const { grants } = await readJson(
      await jsonRequest(harness.app, '/api/assistant-grants', { cookieHeader: owner.cookieHeader }),
      grantsSchema,
    );

    await jsonRequest(harness.app, `/api/assistant-grants/${grants[0]?.id ?? ''}`, {
      method: 'DELETE',
      cookieHeader: owner.cookieHeader,
    });
    const afterRevoke = await postToMcp(
      harness.app,
      INITIALIZE_MESSAGE,
      `Bearer ${tokens.accessToken}`,
    );

    expect(afterRevoke.status).toBe(401);
  });

  it('stops answering once the member resets their password', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);

    const recovery = await recoverPassword(harness.app, {
      username: ASSISTANT_USERNAME,
      newPassword: 'another-correct-horse',
    });
    const afterReset = await postToMcp(
      harness.app,
      INITIALIZE_MESSAGE,
      `Bearer ${tokens.accessToken}`,
    );

    expect(recovery.status).toBe(200);
    expect(afterReset.status).toBe(401);
  });

  it('stops answering once the access token is an hour old', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);

    harness.clock.now = new Date(harness.clock.now.getTime() + ONE_HOUR_MS);
    const expired = await postToMcp(
      harness.app,
      INITIALIZE_MESSAGE,
      `Bearer ${tokens.accessToken}`,
    );

    expect(expired.status).toBe(401);
  });

  it('records the last use of a grant at most once every five minutes', async () => {
    const harness = buildAssistantHarness();
    const owner = await signInOwner(harness);
    const tokens = await connectAssistant(harness.app, owner);
    const firstUse = harness.clock.now;
    const authorization = `Bearer ${tokens.accessToken}`;

    await postToMcp(harness.app, INITIALIZE_MESSAGE, authorization);
    const afterFirstUse = await readLastUsedAt(owner.memberId);
    harness.clock.now = new Date(firstUse.getTime() + FOUR_MINUTES_MS);
    await postToMcp(harness.app, INITIALIZE_MESSAGE, authorization);
    const withinInterval = await readLastUsedAt(owner.memberId);
    harness.clock.now = new Date(firstUse.getTime() + FIVE_MINUTES_MS);
    await postToMcp(harness.app, INITIALIZE_MESSAGE, authorization);
    const afterInterval = await readLastUsedAt(owner.memberId);

    expect(afterFirstUse).toEqual(firstUse);
    expect(withinInterval).toEqual(firstUse);
    expect(afterInterval).toEqual(harness.clock.now);
  });
});
