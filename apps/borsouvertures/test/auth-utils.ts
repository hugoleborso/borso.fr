import type { Hono } from 'hono';
import {
  insertOperatorCredentialUnlessStored,
  insertSigningKeyUnlessStored,
} from '../api/src/__test/test-seed.repository';
import { hashOperatorPassword } from '../api/src/auth/auth.service';
import { OPERATOR_CREDENTIAL_ID, SIGNING_KEY_ID } from '../api/src/auth/operator-session.core';
import { SESSION_COOKIE_NAME } from '../api/src/auth/session-cookie.utils';

export const TEST_HOST = 'http://localhost';
export const TEST_PASSWORD = 'correct-horse-battery';
export const TEST_SIGNING_KEY = Buffer.from('a back e2e signing key').toString('base64');

const FIRST_SESSION_EPOCH = 1;

export async function writeOperatorCredential(password = TEST_PASSWORD): Promise<void> {
  await insertSigningKeyUnlessStored({ id: SIGNING_KEY_ID, hmacKey: TEST_SIGNING_KEY });
  await insertOperatorCredentialUnlessStored({
    id: OPERATOR_CREDENTIAL_ID,
    passwordHash: await hashOperatorPassword(password),
    sessionEpoch: FIRST_SESSION_EPOCH,
    createdAt: new Date(),
  });
}

export function jsonRequest(
  app: Hono,
  method: 'GET' | 'POST',
  path: string,
  options: { readonly body?: unknown; readonly cookie?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.cookie !== undefined) headers.cookie = `${SESSION_COOKIE_NAME}=${options.cookie}`;
  return Promise.resolve(
    app.request(`${TEST_HOST}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  );
}

export function extractSessionCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie') ?? '';
  return new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`).exec(setCookie)?.[1] ?? null;
}

export async function signIn(app: Hono, password = TEST_PASSWORD): Promise<Response> {
  return await jsonRequest(app, 'POST', '/api/auth/sign-in', { body: { password } });
}

export async function signInForCookie(app: Hono): Promise<string> {
  const cookie = extractSessionCookie(await signIn(app));
  if (cookie === null) throw new Error('the sign-in set no session cookie');
  return cookie;
}
