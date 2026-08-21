import { Hono } from 'hono';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { AUTH_COOKIE_NAME, requireAdminSession } from './auth.middleware';
import { createSession } from './auth.repository';

function buildGuardedApp() {
  const app = new Hono();
  app.use('*', requireAdminSession);
  app.get('/secret', (context) => context.json({ ok: true }));
  app.post('/mutate', (context) => context.json({ ok: true }));
  return app;
}

const ALLOWED_ORIGIN = 'https://last-loop-lepin.borso.fr';

function restoreAllowedOriginForTheSuitesThatFollow(original: string | undefined): void {
  if (original === undefined) {
    delete process.env.ALLOWED_ORIGIN;
  } else {
    process.env.ALLOWED_ORIGIN = original;
  }
}

/**
 * @Blueprint test-middleware-integration
 * @BlueprintName Middleware Integration Test
 * @BlueprintUsage Use for a middleware, so it is exercised through a router of its own rather than through the routes of the real application.
 * @BlueprintDescription Builds a throwaway Hono app in `buildGuardedApp` that mounts only the middleware plus one read route and one write route, which lets the suite set `ALLOWED_ORIGIN` for itself and cover both the guarded and the open configuration without changing what the deployed application sees.
 */
describe('auth.middleware', () => {
  const originalOrigin = process.env.ALLOWED_ORIGIN;

  beforeAll(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN;
  });

  afterEach(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN;
  });

  afterAll(() => {
    restoreAllowedOriginForTheSuitesThatFollow(originalOrigin);
  });

  beforeEach(async () => {
    await truncateAllTables();
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
    await createSession({
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
    await createSession({
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
    await createSession({
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
    await createSession({
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
    await createSession({
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
