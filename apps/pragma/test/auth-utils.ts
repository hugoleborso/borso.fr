import type { Hono } from 'hono';
import type { z } from 'zod';
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
  readonly extraHeaders?: Readonly<Record<string, string>>;
}

export async function jsonRequest(
  app: Hono,
  path: string,
  options: JsonRequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...options.extraHeaders,
  };
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

export async function readJson<Output>(
  response: Response,
  schema: z.ZodType<Output>,
): Promise<Output> {
  return schema.parse(await response.json());
}
