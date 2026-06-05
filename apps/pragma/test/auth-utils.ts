/**
 * Helpers for back-e2e tests that exercise gated endpoints. Builds an
 * app with auth already bootstrapped and produces a session cookie
 * header that the suites pass to every gated request.
 */

import type { Hono } from 'hono';
import { createApp } from '../api/src/app';

export const TEST_HOST = 'http://localhost';
export const TEST_PASSWORD = 'correct-horse-battery';
export const SESSION_COOKIE_NAME = 'pragma_session';

export async function buildAuthenticatedApp(): Promise<{ app: Hono; cookieHeader: string }> {
  const app = createApp();
  await app.request(`${TEST_HOST}/api/admin/set-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  const loginResponse = await app.request(`${TEST_HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.250' },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  const setCookie = loginResponse.headers.get('set-cookie');
  if (setCookie === null) throw new Error('login did not return a session cookie');
  const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  const value = match === null ? null : (match[1] ?? null);
  if (value === null) throw new Error('could not extract session cookie value');
  return { app, cookieHeader: `${SESSION_COOKIE_NAME}=${value}` };
}

export interface JsonRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly body?: unknown;
  readonly cookieHeader?: string;
}

export async function jsonRequest(
  app: Hono,
  path: string,
  options: JsonRequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.cookieHeader !== undefined) headers.cookie = options.cookieHeader;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  return app.request(`${TEST_HOST}${path}`, init);
}

/**
 * Reads the JSON body of a Response and validates it via the provided
 * Zod schema. Use this in tests instead of casting `await
 * response.json()` to a TypeScript shape — the repo's
 * no-type-assertion plugin bans the cast, and parsing through Zod
 * doubles as a runtime check that the controller honors its contract.
 */
import type { z } from 'zod';
export async function readJson<Schema extends z.ZodTypeAny>(
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  return schema.parse(await response.json());
}
