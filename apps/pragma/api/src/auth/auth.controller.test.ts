import type { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapSharedPassword,
  createMemberDirectly,
  extractSessionCookie,
  giveMemberCredentials,
  recoverPassword,
  loginAsMember,
  TEST_HOST,
  TEST_PASSWORD,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { loadAppConfig } from './auth.repository';
import { insertPasskey, listPasskeysForMember } from './credentials.repository';
import { requireMemberSession } from './member-session.middleware';

const WRONG_PASSWORD = 'wrong-horse-battery';
const NEW_PASSWORD = 'new-correct-horse-battery';
const WRONG_SHARED_PASSWORD = 'not-the-band-password';
const SHARED_PASSWORD_MAX_FAILURES = 3;
const TOO_SHORT_PASSWORD = 'seven77';

function buildAppWithProtectedRoute(): Hono {
  const app = createApp();
  app.use('/protected/*', requireMemberSession);
  app.get('/protected/ping', (context) => context.json({ ok: true }));
  return app;
}

async function signInOneMember(app: Hono, firstName = 'Tester', username = 'tester') {
  const memberId = await createMemberDirectly(app, firstName);
  await giveMemberCredentials({ memberId, username });
  const response = await loginAsMember(app, username);
  return { memberId, response };
}

// @FollowsBlueprint test-back-e2e
describe('member auth controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('bootstraps the shared password once and refuses a second bootstrap', async () => {
    const app = buildAppWithProtectedRoute();
    expect((await bootstrapSharedPassword(app)).status).toBe(200);
    expect((await bootstrapSharedPassword(app)).status).toBe(409);
  });

  it('logs a member in by username and refuses the wrong password', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    expect((await loginAsMember(app)).status).toBe(200);
    const wrong = await loginAsMember(app, 'tester', WRONG_PASSWORD, '203.0.113.7');
    expect(wrong.status).toBe(401);
  });

  it('rate-limits after 5 attempts in 15 min on the same ip', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const ipAddress = '198.51.100.42';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAsMember(app, 'tester', WRONG_PASSWORD, ipAddress);
      expect(response.status).toBe(401);
    }
    const blocked = await loginAsMember(app, 'tester', WRONG_PASSWORD, ipAddress);
    expect(blocked.status).toBe(429);
  });

  it('replaces a forgotten password with the band password and signs the member in', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);

    const recovered = await recoverPassword(app, { newPassword: NEW_PASSWORD });
    expect(recovered.status).toBe(200);
    const setCookie = recovered.headers.get('set-cookie');
    expect(setCookie).toMatch(/pragma_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);

    const withNewCookie = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${extractSessionCookie(recovered)}` },
    });
    expect(withNewCookie.status).toBe(200);
    expect((await loginAsMember(app, 'tester', NEW_PASSWORD, '203.0.113.31')).status).toBe(200);
    expect((await loginAsMember(app, 'tester', TEST_PASSWORD, '203.0.113.32')).status).toBe(401);
  });

  it('drops the sessions the member had open elsewhere when they recover', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await signInOneMember(app);
    const olderCookie = `pragma_session=${extractSessionCookie(response)}`;

    expect((await recoverPassword(app, { newPassword: NEW_PASSWORD })).status).toBe(200);

    const olderBrowser = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: olderCookie },
    });
    expect(olderBrowser.status).toBe(401);
  });

  it('keeps the member passkeys alive through a recovery', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { memberId } = await signInOneMember(app);
    await insertPasskey({
      memberId,
      credentialId: 'a-registered-key',
      publicKey: Buffer.from([1, 2, 3]),
      signCounter: 0,
      transports: 'internal',
      label: 'Phone',
      createdAt: new Date(),
    });

    expect((await recoverPassword(app, { newPassword: NEW_PASSWORD })).status).toBe(200);

    const passkeys = await listPasskeysForMember(memberId);
    expect(passkeys).toHaveLength(1);
  });

  it('answers a wrong band password and an unknown username identically', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);

    const wrongShared = await recoverPassword(app, {
      sharedPassword: WRONG_SHARED_PASSWORD,
      ipAddress: '198.51.100.61',
    });
    const unknownMember = await recoverPassword(app, {
      username: 'nobody',
      ipAddress: '198.51.100.62',
    });

    expect(wrongShared.status).toBe(401);
    expect(unknownMember.status).toBe(wrongShared.status);
    expect(await unknownMember.json()).toEqual(await wrongShared.json());
  });

  it('closes the recovery door after three failures from one address', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const ipAddress = '198.51.100.70';

    for (let attempt = 0; attempt < SHARED_PASSWORD_MAX_FAILURES; attempt += 1) {
      const refused = await recoverPassword(app, {
        sharedPassword: WRONG_SHARED_PASSWORD,
        ipAddress,
      });
      expect(refused.status).toBe(401);
    }

    const blocked = await recoverPassword(app, {
      sharedPassword: WRONG_SHARED_PASSWORD,
      ipAddress,
    });
    expect(blocked.status).toBe(429);
  });

  it('clears the recovery budget once a recovery succeeds', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const ipAddress = '198.51.100.80';

    expect(
      (await recoverPassword(app, { sharedPassword: WRONG_SHARED_PASSWORD, ipAddress })).status,
    ).toBe(401);
    expect((await recoverPassword(app, { newPassword: NEW_PASSWORD, ipAddress })).status).toBe(200);

    for (let attempt = 0; attempt < SHARED_PASSWORD_MAX_FAILURES; attempt += 1) {
      const refused = await recoverPassword(app, {
        sharedPassword: WRONG_SHARED_PASSWORD,
        ipAddress,
      });
      expect(refused.status).toBe(401);
    }
  });

  it('leaves a failed sign-in budget from counting against the recovery door', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const ipAddress = '198.51.100.90';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await loginAsMember(app, 'tester', WRONG_PASSWORD, ipAddress);
    }

    const recovered = await recoverPassword(app, { newPassword: NEW_PASSWORD, ipAddress });
    expect(recovered.status).toBe(200);
  });

  it('accepts a new password equal to the old one and still moves the epoch', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await signInOneMember(app);
    const olderCookie = `pragma_session=${extractSessionCookie(response)}`;

    const recovered = await recoverPassword(app, { newPassword: TEST_PASSWORD });

    expect(recovered.status).toBe(200);
    expect(
      (await app.request(`${TEST_HOST}/protected/ping`, { headers: { cookie: olderCookie } }))
        .status,
    ).toBe(401);
    expect((await loginAsMember(app, 'tester', TEST_PASSWORD, '203.0.113.51')).status).toBe(200);
  });

  it('refuses a new password shorter than eight characters before it hashes anything', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);

    const refused = await recoverPassword(app, { newPassword: TOO_SHORT_PASSWORD });

    expect(refused.status).toBe(400);
    expect((await loginAsMember(app, 'tester', TEST_PASSWORD, '203.0.113.61')).status).toBe(200);
  });

  it('answers with the session expiry and the member it belongs to', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { memberId } = await signInOneMember(app);

    const recovered = await recoverPassword(app, { newPassword: NEW_PASSWORD });

    expect(await recovered.json()).toEqual({
      expiresAt: expect.any(String),
      memberId,
    });
  });

  it('answers 503 when the application was never bootstrapped', async () => {
    const app = buildAppWithProtectedRoute();
    const memberId = await createMemberDirectly(app, 'Tester');
    await giveMemberCredentials({ memberId, username: 'tester' });

    const refused = await recoverPassword(app, { newPassword: NEW_PASSWORD });

    expect(refused.status).toBe(503);
    expect(await refused.json()).toEqual({ error: 'auth-not-bootstrapped' });
  });

  it('reads a username back through the same trimming the sign-in form applies', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app, 'Borso', 'borso');

    const recovered = await recoverPassword(app, {
      username: '  Borso  ',
      newPassword: NEW_PASSWORD,
    });

    expect(recovered.status).toBe(200);
    expect((await loginAsMember(app, 'borso', NEW_PASSWORD, '203.0.113.41')).status).toBe(200);
  });

  it('no longer serves the enrolment endpoints', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    expect((await app.request(`${TEST_HOST}/api/auth/enrolment`)).status).toBe(404);
    const enrolAttempt = await app.request(`${TEST_HOST}/api/auth/enrol`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memberId: crypto.randomUUID(),
        username: 'ada',
        password: TEST_PASSWORD,
      }),
    });
    expect(enrolAttempt.status).toBe(404);
  });

  it('gates a protected route on the member session cookie', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await signInOneMember(app);
    expect((await app.request(`${TEST_HOST}/protected/ping`)).status).toBe(401);
    const cookie = extractSessionCookie(response);
    const withCookie = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${cookie}` },
    });
    expect(withCookie.status).toBe(200);
  });

  it('refuses a cookie carrying no member, which is the shape issued before accounts existed', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const config = await loadAppConfig();
    expect(config).not.toBeNull();
    const legacyPayload = Buffer.from(
      JSON.stringify({ issuedAt: Date.now(), expiresAt: Date.now() + 1_000_000 }),
    ).toString('base64url');
    const { createHmac } = await import('node:crypto');
    const signature = createHmac('sha256', config?.hmacKey ?? Buffer.alloc(0))
      .update(legacyPayload)
      .digest()
      .toString('base64url');
    const refused = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${legacyPayload}.${signature}` },
    });
    expect(refused.status).toBe(401);
  });

  it('changes a password, keeps that member signed in here and drops their other browsers', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app);
    const firstBrowser = await loginAsMember(app, 'tester', TEST_PASSWORD, '203.0.113.11');
    const secondBrowser = await loginAsMember(app, 'tester', TEST_PASSWORD, '203.0.113.12');
    const firstCookie = `pragma_session=${extractSessionCookie(firstBrowser)}`;
    const secondCookie = `pragma_session=${extractSessionCookie(secondBrowser)}`;

    const changed = await app.request(`${TEST_HOST}/api/me/password`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: firstCookie },
      body: JSON.stringify({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }),
    });
    expect(changed.status).toBe(200);
    const refreshedCookie = `pragma_session=${extractSessionCookie(changed)}`;

    const otherBrowser = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: secondCookie },
    });
    expect(otherBrowser.status).toBe(401);
    const sameBrowser = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: refreshedCookie },
    });
    expect(sameBrowser.status).toBe(200);
    expect((await loginAsMember(app, 'tester', NEW_PASSWORD, '203.0.113.13')).status).toBe(200);
  });

  it('leaves another member signed in when one member changes their password', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await signInOneMember(app, 'Ada', 'ada');
    const graceId = await createMemberDirectly(app, 'Grace');
    await giveMemberCredentials({ memberId: graceId, username: 'grace' });
    const graceLogin = await loginAsMember(app, 'grace', TEST_PASSWORD, '203.0.113.22');
    const graceCookie = `pragma_session=${extractSessionCookie(graceLogin)}`;
    const adaLogin = await loginAsMember(app, 'ada', TEST_PASSWORD, '203.0.113.21');

    await app.request(`${TEST_HOST}/api/me/password`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: `pragma_session=${extractSessionCookie(adaLogin)}`,
      },
      body: JSON.stringify({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD }),
    });

    const grace = await app.request(`${TEST_HOST}/protected/ping`, {
      headers: { cookie: graceCookie },
    });
    expect(grace.status).toBe(200);
  });

  it('refuses rotate-password without a session and rotates it with one', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await signInOneMember(app);
    const cookie = `pragma_session=${extractSessionCookie(response)}`;
    const configBefore = await loadAppConfig();

    const refused = await app.request(`${TEST_HOST}/api/admin/rotate-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: NEW_PASSWORD }),
    });
    expect(refused.status).toBe(401);

    const rotated = await app.request(`${TEST_HOST}/api/admin/rotate-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ password: NEW_PASSWORD }),
    });
    expect(rotated.status).toBe(200);
    const configAfter = await loadAppConfig();
    expect(configAfter?.passwordHash).not.toBe(configBefore?.passwordHash);
    expect(configAfter?.hmacKey.equals(configBefore?.hmacKey ?? Buffer.alloc(0))).toBe(false);
  });
});
