import { Hono } from 'hono';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { signAdminSession } from './auth.jwt';
import { AUTH_COOKIE_NAME, requireAdminSession } from './auth.middleware';

function buildGuardedApp() {
  const app = new Hono();
  app.use('*', requireAdminSession);
  app.get('/secret', (context) => context.json({ ok: true }));
  return app;
}

describe('auth.middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-32-chars-min-padding';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret ?? 'test-secret-32-chars-min-padding';
  });

  it('returns 401 when no cookie is present', async () => {
    const app = buildGuardedApp();
    const response = await app.request('/secret');
    expect(response.status).toBe(401);
  });

  it('returns 401 when the cookie carries a bogus token', async () => {
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=not-a-jwt` },
    });
    expect(response.status).toBe(401);
  });

  it('lets the request through when the cookie carries a valid token', async () => {
    const token = await signAdminSession(process.env.JWT_SECRET ?? '', new Date());
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns 500 when JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET;
    const app = buildGuardedApp();
    const response = await app.request('/secret', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=anything` },
    });
    expect(response.status).toBe(500);
  });
});
