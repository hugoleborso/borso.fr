import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, seedAdminCredentials, truncateAllTables } from '../../../test/database-utils';
import { findValidSession } from './auth.repository';

const loginResponseSchema = z.object({ expiresAt: z.string() });
const errorResponseSchema = z.object({ error: z.string(), reason: z.string() });

const ALLOWED_ORIGIN = 'https://last-loop-lepin.borso.fr';

function readCookieValue(setCookie: string | null, name: string): string | null {
  if (setCookie === null) return null;
  const cookie = setCookie.split(',').find((part) => part.trim().startsWith(`${name}=`));
  if (cookie === undefined) return null;
  const valuePart = cookie.split(';')[0]?.split('=')[1];
  return valuePart ?? null;
}

describe('admin auth controller', () => {
  const originalOrigin = process.env.ALLOWED_ORIGIN;

  beforeAll(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN;
  });

  afterEach(() => {
    process.env.ALLOWED_ORIGIN = ALLOWED_ORIGIN ?? originalOrigin;
  });

  afterAll(() => {
    // Restore so subsequent test files don't inherit the strict cross-origin
    // check (POSTs without `origin` headers would 403 in this suite's wake).
    if (originalOrigin === undefined) {
      delete process.env.ALLOWED_ORIGIN;
    } else {
      process.env.ALLOWED_ORIGIN = originalOrigin;
    }
  });

  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
    await seedAdminCredentials(freshDatabase());
  });

  async function login(pin: string, ip = '127.0.0.1') {
    return createApp().request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ pin }),
    });
  }

  it('returns 200 and sets the lastloop_admin cookie with SameSite=Lax on a correct PIN', async () => {
    const response = await login('lastloop');
    expect(response.status).toBe(200);
    const body = loginResponseSchema.parse(await response.json());
    expect(body.expiresAt).toBeTruthy();
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toMatch(/lastloop_admin=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
  });

  it('persists the session in the DB so verifySession can find it', async () => {
    const response = await login('lastloop');
    const sessionId = readCookieValue(response.headers.get('set-cookie'), 'lastloop_admin');
    expect(sessionId).not.toBeNull();
    if (sessionId === null) throw new Error('session cookie missing');
    const session = await findValidSession(freshDatabase(), sessionId, new Date());
    expect(session?.id).toBe(sessionId);
  });

  it('returns 401 on an incorrect PIN', async () => {
    const response = await login('totallywrong');
    expect(response.status).toBe(401);
    const body = errorResponseSchema.parse(await response.json());
    expect(body.reason).toBe('invalid-pin');
  });

  it('returns 429 once the rate-limit window is full', async () => {
    const ip = '198.51.100.42';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const intermediate = await login('totallywrong', ip);
      expect(intermediate.status).toBe(401);
    }
    const blocked = await login('totallywrong', ip);
    expect(blocked.status).toBe(429);
    const body = errorResponseSchema.parse(await blocked.json());
    expect(body.reason).toBe('rate-limited');
  });

  it('resets the rate-limit window after a successful login', async () => {
    const ip = '198.51.100.43';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await login('totallywrong', ip);
    }
    const success = await login('lastloop', ip);
    expect(success.status).toBe(200);
    const nextAttempt = await login('totallywrong', ip);
    expect(nextAttempt.status).toBe(401);
  });

  it('POST /logout deletes the session and clears the cookie', async () => {
    const loginResponse = await login('lastloop');
    const sessionId = readCookieValue(loginResponse.headers.get('set-cookie'), 'lastloop_admin');
    expect(sessionId).not.toBeNull();
    if (sessionId === null) throw new Error('session cookie missing');

    const logoutResponse = await createApp().request('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        cookie: `lastloop_admin=${sessionId}`,
        origin: ALLOWED_ORIGIN,
      },
    });
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get('set-cookie')).toMatch(/lastloop_admin=;/);
    expect(await findValidSession(freshDatabase(), sessionId, new Date())).toBeNull();
  });
});
