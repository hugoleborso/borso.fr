import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import {
  extractSessionCookie,
  jsonRequest,
  signIn,
  signInForCookie,
  writeOperatorCredential,
} from '../../../test/auth-utils';
import { listSignInAttemptCounts, truncateAllTables } from '../../../test/database-utils';

const refusalSchema = z.object({ error: z.string() });
const sessionSchema = z.object({ signedIn: z.boolean() });

const app = createApp();

async function isSessionSignedIn(cookie?: string): Promise<boolean> {
  const response = await jsonRequest(app, 'GET', '/api/auth/session', { cookie });
  expect(response.status).toBe(200);
  return sessionSchema.parse(await response.json()).signedIn;
}

// @FollowsBlueprint test-back-e2e
describe('the auth routes', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('has no enrolment route', async () => {
    const response = await jsonRequest(app, 'POST', '/api/auth/enrol', {
      body: { password: 'take-the-account' },
    });
    expect(response.status).toBe(404);
  });

  it('answers auth-not-bootstrapped to a sign-in before the script wrote the credential', async () => {
    const response = await signIn(app);
    expect(response.status).toBe(503);
    expect(refusalSchema.parse(await response.json()).error).toBe('auth-not-bootstrapped');
    expect(await isSessionSignedIn()).toBe(false);
  });

  it('signs the operator in with an HttpOnly, SameSite=Strict cookie that the session route accepts', async () => {
    await writeOperatorCredential();
    const response = await signIn(app);
    expect(response.status).toBe(200);
    expect(sessionSchema.parse(await response.json())).toEqual({ signedIn: true });
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Max-Age=2592000');
    const cookie = extractSessionCookie(response) ?? '';
    expect(await isSessionSignedIn(cookie)).toBe(true);
    expect(await isSessionSignedIn()).toBe(false);
    expect(await isSessionSignedIn(`${cookie}x`)).toBe(false);
  });

  it('answers invalid-credentials to a wrong password', async () => {
    await writeOperatorCredential();
    const response = await signIn(app, 'wrong-password');
    expect(response.status).toBe(401);
    expect(refusalSchema.parse(await response.json()).error).toBe('invalid-credentials');
    expect(extractSessionCookie(response)).toBeNull();
  });

  it('refuses an empty password before reading the database', async () => {
    const response = await signIn(app, '');
    expect(response.status).toBe(400);
  });

  it('rate limits the sixth failed sign-in, even with the right password', async () => {
    await writeOperatorCredential();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await signIn(app, 'wrong-password');
      expect(response.status).toBe(401);
    }
    const sixth = await signIn(app);
    expect(sixth.status).toBe(429);
    expect(refusalSchema.parse(await sixth.json()).error).toBe('rate-limited');
  });

  it('counts every one of seven wrong passwords sent at once from one address, and refuses the two above the limit', async () => {
    await writeOperatorCredential();
    const settled = await Promise.allSettled(
      Array.from({ length: 7 }, async () => (await signIn(app, 'wrong-password')).status),
    );
    const statuses = settled.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    expect(statuses.toSorted((left, right) => left - right)).toEqual([
      401, 401, 401, 401, 401, 429, 429,
    ]);
    expect(await listSignInAttemptCounts()).toEqual([7]);
  });

  it('clears the failed attempts after a sign-in that succeeds', async () => {
    await writeOperatorCredential();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await signIn(app, 'wrong-password');
    }
    expect((await signIn(app)).status).toBe(200);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await signIn(app, 'wrong-password')).status).toBe(401);
    }
  });

  it('signs out with 204 and clears the cookie, and refuses a sign-out without a session', async () => {
    await writeOperatorCredential();
    expect((await jsonRequest(app, 'POST', '/api/auth/sign-out')).status).toBe(401);
    const cookie = await signInForCookie(app);
    const response = await jsonRequest(app, 'POST', '/api/auth/sign-out', { cookie });
    expect(response.status).toBe(204);
    expect(extractSessionCookie(response)).toBe('');
  });
});
