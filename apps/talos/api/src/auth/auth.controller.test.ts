import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDatabase } from '../database/client';
import {
  buildTestContext,
  requestJson,
  signIn,
  TEST_SECRETS,
  useTestSecrets,
} from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { createSoftwareAuthenticator } from '../../../test/software-authenticator';
import { createApp } from '../app';
import { passkeyTable, sessionTable } from './auth.schema';

const ORIGIN = 'http://localhost:5180';
const BOOTSTRAP_CODE = TEST_SECRETS['bootstrap-code'] ?? '';

interface ChallengeOptions {
  readonly challenge: string;
}

function readSessionCookie(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  const value = /talos_session=([^;]*)/.exec(header)?.[1] ?? '';
  return `talos_session=${value}`;
}

async function readChallenge(response: Response): Promise<string> {
  const options: ChallengeOptions = await response.json();
  return options.challenge;
}

beforeAll(() => {
  vi.stubEnv('TALOS_RP_ID', 'localhost');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  await truncateAllTables();
});

async function registerFirstPasskey(app = buildTestContext().app) {
  const authenticator = createSoftwareAuthenticator('localhost');
  const optionsResponse = await requestJson(app, '/api/auth/registration/options', {
    method: 'POST',
    body: { code: BOOTSTRAP_CODE },
  });
  const challenge = await readChallenge(optionsResponse);
  const verification = await requestJson(app, '/api/auth/registration/verification', {
    method: 'POST',
    body: { response: authenticator.register(challenge, ORIGIN) },
  });
  return { app, authenticator, verification };
}

// @FollowsBlueprint test-back-e2e
describe('the session route', () => {
  it('tells a stranger nobody is signed in and no passkey exists yet', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/session');
    expect(await response.json()).toEqual({ signedIn: false, registered: false });
  });
});

describe('registering the first passkey', () => {
  it('refuses registration options without the bootstrap code', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/auth/registration/options', {
      method: 'POST',
      body: {},
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Code de démarrage invalide.' });
  });

  it('refuses a wrong bootstrap code', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/auth/registration/options', {
      method: 'POST',
      body: { code: 'mauvais' },
    });
    expect(response.status).toBe(401);
  });

  it('answers 503 while no bootstrap code is configured', async () => {
    const { app } = buildTestContext();
    useTestSecrets({ 'bootstrap-code': undefined });
    const response = await requestJson(app, '/api/auth/registration/options', {
      method: 'POST',
      body: { code: 'x' },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Talos n'est pas encore configuré." });
  });

  it('stops a script guessing the code after ten attempts, whatever X-Forwarded-For it forges', async () => {
    const { app } = buildTestContext();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await requestJson(app, '/api/auth/registration/options', {
        method: 'POST',
        body: { code: 'mauvais' },
        clientAddress: '203.0.113.9',
        headers: { 'x-forwarded-for': `10.0.0.${attempt}` },
      });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('counts concurrent guesses one by one rather than once', async () => {
    const { app } = buildTestContext();
    const statuses = await Promise.all(
      Array.from({ length: 14 }, async () => {
        const response = await requestJson(app, '/api/auth/registration/options', {
          method: 'POST',
          body: { code: 'mauvais' },
          clientAddress: '203.0.113.10',
        });
        return response.status;
      }),
    );
    expect(statuses.filter((status) => status === 429).length).toBe(4);
  });

  it('registers a passkey with the code and signs the owner in with a strict cookie', async () => {
    const { app, verification } = await registerFirstPasskey();
    expect(verification.status).toBe(200);
    expect(await verification.json()).toEqual({ ok: true });
    const setCookie = verification.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/talos_session=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Max-Age=2592000/);
    const status = await requestJson(app, '/api/session', {
      cookie: readSessionCookie(verification),
    });
    expect(await status.json()).toEqual({ signedIn: true, registered: true });
    const [stored] = await getDatabase().select().from(passkeyTable);
    expect(stored?.transports).toBe('["internal"]');
  });

  it('refuses a registration answering an unknown challenge', async () => {
    const { app } = buildTestContext();
    const authenticator = createSoftwareAuthenticator('localhost');
    const response = await requestJson(app, '/api/auth/registration/verification', {
      method: 'POST',
      body: { response: authenticator.register('inconnu', ORIGIN) },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "La passkey n'a pas été reconnue." });
  });

  it('refuses a registration signed for another origin', async () => {
    const { app } = buildTestContext();
    const authenticator = createSoftwareAuthenticator('localhost');
    const optionsResponse = await requestJson(app, '/api/auth/registration/options', {
      method: 'POST',
      body: { code: BOOTSTRAP_CODE },
    });
    const challenge = await readChallenge(optionsResponse);
    const response = await requestJson(app, '/api/auth/registration/verification', {
      method: 'POST',
      body: { response: authenticator.register(challenge, 'https://ailleurs.fr') },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a registration answering a challenge past its five minutes', async () => {
    buildTestContext();
    const clock = { now: new Date('2026-10-05T08:00:00Z') };
    const app = createApp({ auth: { clock: () => clock.now } });
    const authenticator = createSoftwareAuthenticator('localhost');
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/registration/options', {
        method: 'POST',
        body: { code: BOOTSTRAP_CODE },
      }),
    );
    clock.now = new Date('2026-10-05T08:05:00Z');
    const response = await requestJson(app, '/api/auth/registration/verification', {
      method: 'POST',
      body: { response: authenticator.register(challenge, ORIGIN) },
    });
    expect(response.status).toBe(401);
  });
});

describe('once a passkey exists', () => {
  it('closes registration to anyone not signed in', async () => {
    const { app } = await registerFirstPasskey();
    const response = await requestJson(app, '/api/auth/registration/options', {
      method: 'POST',
      body: { code: BOOTSTRAP_CODE },
    });
    expect(response.status).toBe(403);
  });

  it('lets a signed-in session add a second passkey without the code', async () => {
    const { app, verification } = await registerFirstPasskey();
    const cookie = readSessionCookie(verification);
    const second = createSoftwareAuthenticator('localhost');
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/registration/options', {
        method: 'POST',
        body: {},
        cookie,
      }),
    );
    const response = await requestJson(app, '/api/auth/registration/verification', {
      method: 'POST',
      body: { response: second.register(challenge, ORIGIN) },
      cookie,
    });
    expect(response.status).toBe(200);
    expect(await getDatabase().select().from(passkeyTable)).toHaveLength(2);
  });

  it('refuses to finish a registration started before the first passkey existed, without a session', async () => {
    const { app } = buildTestContext();
    const late = createSoftwareAuthenticator('localhost');
    const lateChallenge = await readChallenge(
      await requestJson(app, '/api/auth/registration/options', {
        method: 'POST',
        body: { code: BOOTSTRAP_CODE },
      }),
    );
    await registerFirstPasskey(app);
    const response = await requestJson(app, '/api/auth/registration/verification', {
      method: 'POST',
      body: { response: late.register(lateChallenge, ORIGIN) },
    });
    expect(response.status).toBe(403);
  });
});

describe('signing in with a passkey', () => {
  it('signs in with a registered passkey and records its counter', async () => {
    const { app, authenticator } = await registerFirstPasskey();
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/login/options', { method: 'POST' }),
    );
    const response = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: authenticator.authenticate(challenge, ORIGIN) },
    });
    expect(response.status).toBe(200);
    expect(readSessionCookie(response)).not.toBe('talos_session=');
    const [stored] = await getDatabase().select().from(passkeyTable);
    expect(stored?.signCounter).toBe(1);
  });

  it('refuses a passkey nobody registered', async () => {
    const { app } = await registerFirstPasskey();
    const stranger = createSoftwareAuthenticator('localhost');
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/login/options', { method: 'POST' }),
    );
    const response = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: stranger.authenticate(challenge, ORIGIN) },
    });
    expect(response.status).toBe(401);
  });

  it('refuses to reuse a challenge', async () => {
    const { app, authenticator } = await registerFirstPasskey();
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/login/options', { method: 'POST' }),
    );
    const first = authenticator.authenticate(challenge, ORIGIN);
    await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: first },
    });
    const replay = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: authenticator.authenticate(challenge, ORIGIN) },
    });
    expect(replay.status).toBe(401);
  });

  it('refuses an assertion signed for another origin', async () => {
    const { app, authenticator } = await registerFirstPasskey();
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/login/options', { method: 'POST' }),
    );
    const response = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: authenticator.authenticate(challenge, 'https://ailleurs.fr') },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a registration challenge used to sign in', async () => {
    const { app, authenticator, verification } = await registerFirstPasskey();
    const challenge = await readChallenge(
      await requestJson(app, '/api/auth/registration/options', {
        method: 'POST',
        body: {},
        cookie: readSessionCookie(verification),
      }),
    );
    const response = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: authenticator.authenticate(challenge, ORIGIN) },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a response without a readable challenge', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/auth/login/verification', {
      method: 'POST',
      body: { response: { id: 'x', rawId: 'x' } },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a body that is not json', async () => {
    const { app } = buildTestContext();
    const response = await app.request('http://localhost/api/auth/login/verification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'pas du json',
    });
    expect(response.status).toBe(400);
  });
});

async function addSecondPasskey(app: ReturnType<typeof buildTestContext>['app'], cookie: string) {
  const second = createSoftwareAuthenticator('localhost');
  const challenge = await readChallenge(
    await requestJson(app, '/api/auth/registration/options', { method: 'POST', body: {}, cookie }),
  );
  await requestJson(app, '/api/auth/registration/verification', {
    method: 'POST',
    body: { response: second.register(challenge, ORIGIN) },
    cookie,
  });
}

interface PasskeyList {
  readonly items: readonly { readonly id: string; readonly createdAt: string }[];
}

async function listPasskeyIds(app: ReturnType<typeof buildTestContext>['app'], cookie: string) {
  const response = await requestJson(app, '/api/auth/passkeys', { cookie });
  const list: PasskeyList = await response.json();
  return list.items.map((item) => item.id);
}

describe('managing passkeys from a session', () => {
  it('lists the registered passkeys, oldest first, with their creation date', async () => {
    const { app, verification } = await registerFirstPasskey();
    const cookie = readSessionCookie(verification);
    await addSecondPasskey(app, cookie);
    const response = await requestJson(app, '/api/auth/passkeys', { cookie });
    const list: PasskeyList = await response.json();
    expect(list.items).toHaveLength(2);
    expect(list.items[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(list.items.map((item) => item.createdAt)).toEqual(
      list.items.map((item) => item.createdAt).toSorted(),
    );
  });

  it('removes a passkey while another one remains', async () => {
    const { app, verification } = await registerFirstPasskey();
    const cookie = readSessionCookie(verification);
    await addSecondPasskey(app, cookie);
    const [first] = await listPasskeyIds(app, cookie);
    const response = await requestJson(app, `/api/auth/passkeys/${first ?? ''}`, {
      method: 'DELETE',
      cookie,
    });
    expect(await response.json()).toEqual({ ok: true });
    expect(await listPasskeyIds(app, cookie)).toHaveLength(1);
  });

  it('refuses to remove the last passkey', async () => {
    const { app, verification } = await registerFirstPasskey();
    const cookie = readSessionCookie(verification);
    const [only] = await listPasskeyIds(app, cookie);
    const response = await requestJson(app, `/api/auth/passkeys/${only ?? ''}`, {
      method: 'DELETE',
      cookie,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Impossible de supprimer la dernière passkey : ajoutes-en une autre avant.',
    });
    expect(await getDatabase().select().from(passkeyTable)).toHaveLength(1);
  });

  it('answers 404 for a passkey nobody registered', async () => {
    const { app, verification } = await registerFirstPasskey();
    const response = await requestJson(
      app,
      '/api/auth/passkeys/00000000-0000-4000-8000-000000000000',
      { method: 'DELETE', cookie: readSessionCookie(verification) },
    );
    expect(response.status).toBe(404);
  });

  it('refuses an identifier that is not a uuid', async () => {
    const { app, verification } = await registerFirstPasskey();
    const response = await requestJson(app, '/api/auth/passkeys/pas-un-uuid', {
      method: 'DELETE',
      cookie: readSessionCookie(verification),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a visitor without a session', async () => {
    const { app } = await registerFirstPasskey();
    expect((await requestJson(app, '/api/auth/passkeys')).status).toBe(401);
  });
});

describe('signing out', () => {
  it('forgets the session and clears the cookie', async () => {
    const { app, verification } = await registerFirstPasskey();
    const cookie = readSessionCookie(verification);
    const response = await requestJson(app, '/api/auth/logout', { method: 'POST', cookie });
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('set-cookie')).toMatch(/talos_session=;/);
    expect(await getDatabase().select().from(sessionTable)).toHaveLength(0);
    const status = await requestJson(app, '/api/session', { cookie });
    expect(await status.json()).toEqual({ signedIn: false, registered: true });
  });

  it('answers ok when nobody was signed in', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/auth/logout', { method: 'POST' });
    expect(response.status).toBe(200);
  });
});

describe('the session gate on content routes', () => {
  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/focus');
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Connexion requise.' });
  });

  it('refuses a cookie signed with another key', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    useTestSecrets({ 'session-hmac': 'une-autre-clé' });
    expect((await requestJson(app, '/api/focus', { cookie })).status).toBe(401);
  });

  it('refuses a session whose row expired', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    await getDatabase()
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessionTable.expiresAt, sessionTable.expiresAt));
    expect((await requestJson(app, '/api/focus', { cookie })).status).toBe(401);
  });

  it('answers 503 when the session key is not configured', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    useTestSecrets({ 'session-hmac': undefined });
    expect((await requestJson(app, '/api/focus', { cookie })).status).toBe(503);
  });
});
