import type { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapSharedPassword,
  createMemberDirectly,
  enrol,
  extractSessionCookie,
  loginAsMember,
  TEST_HOST,
  TEST_PASSWORD,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { loadAppConfig } from './auth.repository';
import { requireMemberSession } from './member-session.middleware';

const WRONG_PASSWORD = 'wrong-horse-battery';
const NEW_PASSWORD = 'new-correct-horse-battery';

function buildAppWithProtectedRoute(): Hono {
  const app = createApp();
  app.use('/protected/*', requireMemberSession);
  app.get('/protected/ping', (context) => context.json({ ok: true }));
  return app;
}

async function enrolOneMember(app: Hono, firstName = 'Tester', username = 'tester') {
  const memberId = await createMemberDirectly(app, firstName);
  const response = await enrol(app, { memberId, username });
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

  it('enrols a member with the shared password and signs them in', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await enrolOneMember(app);
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toMatch(/pragma_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });

  it('refuses enrolment with the wrong shared password', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const memberId = await createMemberDirectly(app, 'Tester');
    const response = await enrol(app, { memberId, sharedPassword: WRONG_PASSWORD });
    expect(response.status).toBe(401);
  });

  it('closes the enrolment window once every member holds a credential', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await enrolOneMember(app, 'Ada', 'ada');
    const windowResponse = await app.request(`${TEST_HOST}/api/auth/enrolment`);
    expect(windowResponse.status).toBe(409);
    const extraMemberId = await createMemberDirectly(app, 'Grace');
    const reopened = await app.request(`${TEST_HOST}/api/auth/enrolment`);
    expect(reopened.status).toBe(200);
    expect((await enrol(app, { memberId: extraMemberId, username: 'grace' })).status).toBe(200);
    expect((await app.request(`${TEST_HOST}/api/auth/enrolment`)).status).toBe(409);
  });

  it('refuses a second enrolment of the same member', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { memberId } = await enrolOneMember(app, 'Ada', 'ada');
    await createMemberDirectly(app, 'Grace');
    const again = await enrol(app, { memberId, username: 'ada2' });
    expect(again.status).toBe(409);
  });

  it('refuses a username another member already holds', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await enrolOneMember(app, 'Ada', 'ada');
    const otherMemberId = await createMemberDirectly(app, 'Grace');
    expect((await enrol(app, { memberId: otherMemberId, username: 'ada' })).status).toBe(409);
  });

  it('logs a member in by username and refuses the wrong password', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await enrolOneMember(app);
    expect((await loginAsMember(app)).status).toBe(200);
    const wrong = await loginAsMember(app, 'tester', WRONG_PASSWORD, '203.0.113.7');
    expect(wrong.status).toBe(401);
  });

  it('rate-limits after 5 attempts in 15 min on the same ip', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    await enrolOneMember(app);
    const ipAddress = '198.51.100.42';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAsMember(app, 'tester', WRONG_PASSWORD, ipAddress);
      expect(response.status).toBe(401);
    }
    const blocked = await loginAsMember(app, 'tester', WRONG_PASSWORD, ipAddress);
    expect(blocked.status).toBe(429);
  });

  it('gates a protected route on the member session cookie', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrapSharedPassword(app);
    const { response } = await enrolOneMember(app);
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
    await enrolOneMember(app);
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
    await enrolOneMember(app);
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
    await enrolOneMember(app, 'Ada', 'ada');
    const graceId = await createMemberDirectly(app, 'Grace');
    const graceEnrolment = await enrol(app, { memberId: graceId, username: 'grace' });
    const graceCookie = `pragma_session=${extractSessionCookie(graceEnrolment)}`;
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
    const { response } = await enrolOneMember(app);
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
