import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';

const loginResponseSchema = z.object({ expiresAt: z.string() });
const errorResponseSchema = z.object({ error: z.string(), reason: z.string() });

describe('admin auth controller', () => {
  const app = createApp();
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.PIN_HASH = process.env.PIN_HASH ?? 'scrypt$00$00';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  async function login(pin: string, ip = '127.0.0.1') {
    return app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ pin }),
    });
  }

  it('returns 200 and sets the lastloop_admin cookie on a correct PIN', async () => {
    const response = await login('lastloop');
    expect(response.status).toBe(200);
    const body = loginResponseSchema.parse(await response.json());
    expect(body.expiresAt).toBeTruthy();
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toMatch(/lastloop_admin=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
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
});
