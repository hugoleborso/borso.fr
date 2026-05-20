/**
 * Back-e2e tests for the shared-password auth endpoints. Exercise:
 *  - bootstrap (set-password) happy path + 409 if already bootstrapped
 *  - login: 401 on bad password, 200 + cookie on good password
 *  - rate-limit: 6th attempt within 15 min returns 429
 *  - rotate-password: invalidates existing cookies (HMAC key changes)
 *  - middleware: 401 without cookie, 200 with fresh cookie
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';
import { createApp } from '../app';
import { loadAppConfig } from './auth.repository';
import { requireSharedPasswordSession } from './shared-password.middleware';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const ANY_HOST = 'http://localhost';
const VALID_PASSWORD = 'correct-horse-battery';
const WRONG_PASSWORD = 'wrong-horse-battery';

function buildAppWithProtectedRoute(): Hono {
  const app = createApp();
  app.use('/protected/*', requireSharedPasswordSession);
  app.get('/protected/ping', (context) => context.json({ ok: true }));
  return app;
}

async function bootstrap(app: Hono, password: string): Promise<Response> {
  return app.request(`${ANY_HOST}/api/admin/set-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

async function login(app: Hono, password: string, ip = '203.0.113.1'): Promise<Response> {
  return app.request(`${ANY_HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ password }),
  });
}

function extractSessionCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie === null) return null;
  const match = /pragma_session=([^;]+)/.exec(setCookie);
  return match === null ? null : (match[1] ?? null);
}

describe('shared-password auth controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('bootstraps via set-password and rejects subsequent attempts with 409', async () => {
    const app = buildAppWithProtectedRoute();
    const first = await bootstrap(app, VALID_PASSWORD);
    expect(first.status).toBe(200);
    const second = await bootstrap(app, VALID_PASSWORD);
    expect(second.status).toBe(409);
  });

  it('returns 503 on login when the app has not been bootstrapped', async () => {
    const app = buildAppWithProtectedRoute();
    const response = await login(app, VALID_PASSWORD);
    expect(response.status).toBe(503);
  });

  it('logs in with the correct password and sets the session cookie', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const response = await login(app, VALID_PASSWORD);
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toMatch(/pragma_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });

  it('returns 401 on the wrong password', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const response = await login(app, WRONG_PASSWORD);
    expect(response.status).toBe(401);
  });

  it('rate-limits after 5 attempts in 15 min on the same ip', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const ip = '198.51.100.42';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(app, WRONG_PASSWORD, ip);
      expect(response.status).toBe(401);
    }
    const blocked = await login(app, WRONG_PASSWORD, ip);
    expect(blocked.status).toBe(429);
  });

  it('gates a protected route by requiring the session cookie', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const noCookie = await app.request(`${ANY_HOST}/protected/ping`);
    expect(noCookie.status).toBe(401);
    const loggedIn = await login(app, VALID_PASSWORD);
    const cookie = extractSessionCookie(loggedIn);
    expect(cookie).not.toBeNull();
    const withCookie = await app.request(`${ANY_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${cookie}` },
    });
    expect(withCookie.status).toBe(200);
  });

  it('rejects rotate-password with 401 when no session cookie is presented', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const configBefore = await loadAppConfig(testDatabase());
    expect(configBefore).not.toBeNull();

    const rotateResponse = await app.request(`${ANY_HOST}/api/admin/rotate-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'new-correct-horse-battery' }),
    });
    expect(rotateResponse.status).toBe(401);

    // The row MUST stay untouched: anyone hitting the endpoint without
    // a cookie should not be able to mutate password_hash or hmac_key.
    const configAfter = await loadAppConfig(testDatabase());
    expect(configAfter).not.toBeNull();
    expect(configAfter?.passwordHash).toBe(configBefore?.passwordHash);
    expect(configAfter?.hmacKey.equals(configBefore?.hmacKey ?? Buffer.alloc(0))).toBe(true);

    // The original password still works.
    const stillValid = await login(app, VALID_PASSWORD, '203.0.113.50');
    expect(stillValid.status).toBe(200);
  });

  it('rotates password + HMAC key and invalidates every existing cookie when a valid session cookie is presented', async () => {
    const app = buildAppWithProtectedRoute();
    await bootstrap(app, VALID_PASSWORD);
    const initialLogin = await login(app, VALID_PASSWORD);
    const initialCookie = extractSessionCookie(initialLogin);
    expect(initialCookie).not.toBeNull();
    const protectedBefore = await app.request(`${ANY_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${initialCookie}` },
    });
    expect(protectedBefore.status).toBe(200);

    const configBefore = await loadAppConfig(testDatabase());
    expect(configBefore).not.toBeNull();

    const rotateResponse = await app.request(`${ANY_HOST}/api/admin/rotate-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `pragma_session=${initialCookie}`,
      },
      body: JSON.stringify({ password: 'new-correct-horse-battery' }),
    });
    expect(rotateResponse.status).toBe(200);

    // The row MUST have been mutated: both columns rewritten.
    const configAfter = await loadAppConfig(testDatabase());
    expect(configAfter).not.toBeNull();
    expect(configAfter?.passwordHash).not.toBe(configBefore?.passwordHash);
    expect(configAfter?.hmacKey.equals(configBefore?.hmacKey ?? Buffer.alloc(0))).toBe(false);

    // Old cookie no longer matches the rotated HMAC key.
    const protectedAfter = await app.request(`${ANY_HOST}/protected/ping`, {
      headers: { cookie: `pragma_session=${initialCookie}` },
    });
    expect(protectedAfter.status).toBe(401);

    // Old password is gone; new password works.
    const oldLogin = await login(app, VALID_PASSWORD, '203.0.113.99');
    expect(oldLogin.status).toBe(401);
    const newLogin = await login(app, 'new-correct-horse-battery', '203.0.113.100');
    expect(newLogin.status).toBe(200);
  });
});
