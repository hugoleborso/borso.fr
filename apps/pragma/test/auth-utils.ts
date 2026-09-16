import type { Hono } from 'hono';
import type { z } from 'zod';
import { createApp } from '../api/src/app';

export const TEST_HOST = 'http://localhost';
export const TEST_PASSWORD = 'correct-horse-battery';
export const TEST_SHARED_PASSWORD = 'shared-horse-battery';
export const TEST_USERNAME = 'tester';
export const SESSION_COOKIE_NAME = 'pragma_session';

export function extractSessionCookie(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie === null) return null;
  const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  return match === null ? null : (match[1] ?? null);
}

export async function bootstrapSharedPassword(app: Hono, password = TEST_SHARED_PASSWORD) {
  return app.request(`${TEST_HOST}/api/admin/set-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export async function createMemberDirectly(app: Hono, firstName: string): Promise<string> {
  const { insertMember } = await import('../api/src/members/members.repository');
  const member = await insertMember({
    firstName,
    color: '#ff8a65',
    avatarS3Key: null,
    phone: null,
    email: null,
  });
  return member.id;
}

export async function enrol(
  app: Hono,
  params: {
    memberId: string;
    username?: string;
    password?: string;
    sharedPassword?: string;
  },
): Promise<Response> {
  return app.request(`${TEST_HOST}/api/auth/enrol`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      memberId: params.memberId,
      username: params.username ?? TEST_USERNAME,
      password: params.password ?? TEST_PASSWORD,
      sharedPassword: params.sharedPassword ?? TEST_SHARED_PASSWORD,
    }),
  });
}

export async function loginAsMember(
  app: Hono,
  username = TEST_USERNAME,
  password = TEST_PASSWORD,
  ipAddress = '203.0.113.250',
): Promise<Response> {
  return app.request(`${TEST_HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ipAddress },
    body: JSON.stringify({ username, password }),
  });
}

export interface AuthenticatedApp {
  readonly app: Hono;
  readonly cookieHeader: string;
  readonly memberId: string;
}

let enrolmentCounter = 0;

export async function buildAuthenticatedApp(firstName = 'Tester'): Promise<AuthenticatedApp> {
  const app = createApp();
  await bootstrapSharedPassword(app);
  const memberId = await createMemberDirectly(app, firstName);
  enrolmentCounter += 1;
  const enrolResponse = await enrol(app, {
    memberId,
    username: `${TEST_USERNAME}${String(enrolmentCounter)}`,
  });
  const value = extractSessionCookie(enrolResponse);
  if (value === null) throw new Error('enrolment did not return a session cookie');
  return { app, cookieHeader: `${SESSION_COOKIE_NAME}=${value}`, memberId };
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
