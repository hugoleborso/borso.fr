import { Hono } from 'hono';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { createSession } from './auth.repository';
import { AUTH_COOKIE_NAME, requireAdminSession } from './auth.middleware';

function buildGuardedApp() {
  const app = new Hono();
  app.use('*', requireAdminSession);
  app.get('/secret', (context) => context.json({ ok: true }));
  app.post('/mutate', (context) => context.json({ ok: true }));
  return app;
}

const ALLOWED_ORIGIN = 'https://last-loop-lepin.borso.fr';

describe('auth.middleware', () => {
  const originalOrigin = process.env.ALLOWED_ORIGIN;

  beforeAll(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN;
  });

  afterEach(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN;
  });

  afterAll(() => {
    // Critical: restore the env var so subsequent test files (controller
    // suites that POST without `origin` headers) don't trip the cross-origin
    // check inherited from a previous worker.
    if (originalOrigin === undefined) {
      delete process.env.ALLOWED_ORIGIN;
    } else {
      process.env.ALLOWED_ORIGIN = originalOrigin;
    }
  });

  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('returns 401 when no cookie is present', async () => {
    const app = buildGuardedApp();
    const response = await app.request('/secret');
    expect(response.status).toBe(401);
  });

  it('returns 401 when the cookie carries an unknown session id', async () => {
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=unknown-id` },
    });
    expect(response.status).toBe(401);
  });

  it('returns 401 + clears the cookie when the session has expired', async () => {
    const now = new Date();
    await createSession(freshDatabase(), {
      id: 'expired-id',
      expiresAt: new Date(now.getTime() - 60_000),
    });
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=expired-id` },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toMatch(/lastloop_admin=;/);
  });

  it('lets a GET through when the cookie maps to a live session', async () => {
    const now = new Date();
    await createSession(freshDatabase(), {
      id: 'live-id',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=live-id` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('rejects state-changing requests with a missing Origin header (403)', async () => {
    const now = new Date();
    await createSession(freshDatabase(), {
      id: 'live-id-2',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const app = buildGuardedApp();
    const response = await app.request('/mutate', {
      method: 'POST',
      headers: { cookie: `${AUTH_COOKIE_NAME}=live-id-2` },
    });
    expect(response.status).toBe(403);
  });

  it('rejects state-changing requests with a foreign Origin header (403)', async () => {
    const now = new Date();
    await createSession(freshDatabase(), {
      id: 'live-id-3',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const app = buildGuardedApp();
    const response = await app.request('/mutate', {
      method: 'POST',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=live-id-3`,
        origin: 'https://evil.example.com',
      },
    });
    expect(response.status).toBe(403);
  });

  it('lets state-changing requests through when Origin matches ALLOWED_ORIGIN', async () => {
    const now = new Date();
    await createSession(freshDatabase(), {
      id: 'live-id-4',
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const app = buildGuardedApp();
    const response = await app.request('/mutate', {
      method: 'POST',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=live-id-4`,
        origin: ALLOWED_ORIGIN,
      },
    });
    expect(response.status).toBe(200);
  });
});

