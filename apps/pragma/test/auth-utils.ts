import { randomBytes } from 'node:crypto';
import type { Hono } from 'hono';
import type { z } from 'zod';
import { createApp } from '../api/src/app';
import { insertInitialAppConfig, loadAppConfig } from '../api/src/auth/auth.repository';
import { insertCredential } from '../api/src/auth/credentials.repository';
import { hashPassword, issueSessionForMember } from '../api/src/auth/credentials.service';

export const TEST_HOST = 'http://localhost';
export const TEST_PASSWORD = 'correct-horse-battery';
export const TEST_SHARED_PASSWORD = 'shared-horse-battery';
export const TEST_USERNAME = 'tester';
export const SESSION_COOKIE_NAME = 'pragma_session';
export const DEFAULT_CLIENT_ADDRESS = '203.0.113.250';

export function lambdaEnvironmentFrom(sourceIp: string): unknown {
  return { event: { requestContext: { http: { sourceIp } } } };
}

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

export async function giveMemberCredentials(params: {
  memberId: string;
  username?: string;
  password?: string;
}): Promise<void> {
  const { createCredentialForMember } = await import('../api/src/auth/credentials.service');
  const outcome = await createCredentialForMember({
    memberId: params.memberId,
    username: params.username ?? TEST_USERNAME,
    password: params.password ?? TEST_PASSWORD,
    now: new Date(),
  });
  if (outcome.kind !== 'ok') throw new Error(`could not create credentials: ${outcome.kind}`);
}

export async function recoverPassword(
  app: Hono,
  params: {
    username?: string;
    sharedPassword?: string;
    newPassword?: string;
    ipAddress?: string;
    extraHeaders?: Record<string, string>;
  } = {},
): Promise<Response> {
  return app.request(
    `${TEST_HOST}/api/auth/recover-password`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...params.extraHeaders },
      body: JSON.stringify({
        username: params.username ?? TEST_USERNAME,
        sharedPassword: params.sharedPassword ?? TEST_SHARED_PASSWORD,
        newPassword: params.newPassword ?? TEST_PASSWORD,
      }),
    },
    lambdaEnvironmentFrom(params.ipAddress ?? DEFAULT_CLIENT_ADDRESS),
  );
}

export async function loginAsMember(
  app: Hono,
  username = TEST_USERNAME,
  password = TEST_PASSWORD,
  ipAddress = DEFAULT_CLIENT_ADDRESS,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  return app.request(
    `${TEST_HOST}/api/auth/login`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...extraHeaders },
      body: JSON.stringify({ username, password }),
    },
    lambdaEnvironmentFrom(ipAddress),
  );
}

export interface AuthenticatedApp {
  readonly app: Hono;
  readonly cookieHeader: string;
  readonly memberId: string;
}

let credentialCounter = 0;

const HMAC_KEY_BYTES = 32;
const FIRST_SESSION_EPOCH = 1;

let sharedPasswordHash: Promise<string> | undefined;
let memberPasswordHash: Promise<string> | undefined;

async function ensureSharedPasswordConfigured(now: Date): Promise<void> {
  if ((await loadAppConfig()) !== null) return;
  sharedPasswordHash ??= hashPassword(TEST_SHARED_PASSWORD);
  await insertInitialAppConfig(await sharedPasswordHash, randomBytes(HMAC_KEY_BYTES), now);
}

async function enrolMemberWithTestPassword(
  memberId: string,
  username: string,
  now: Date,
): Promise<void> {
  memberPasswordHash ??= hashPassword(TEST_PASSWORD);
  await insertCredential({
    memberId,
    username,
    passwordHash: await memberPasswordHash,
    sessionEpoch: FIRST_SESSION_EPOCH,
    createdAt: now,
  });
}

export async function buildAuthenticatedApp(firstName = 'Tester'): Promise<AuthenticatedApp> {
  const app = createApp();
  const now = new Date();
  await ensureSharedPasswordConfigured(now);
  const memberId = await createMemberDirectly(app, firstName);
  credentialCounter += 1;
  const username = `${TEST_USERNAME}${String(credentialCounter)}`;
  await enrolMemberWithTestPassword(memberId, username, now);
  const session = await issueSessionForMember(memberId, now);
  if (session === null) throw new Error('issuing a session for the test member failed');
  return { app, cookieHeader: `${SESSION_COOKIE_NAME}=${session.cookieValue}`, memberId };
}

export interface JsonRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly body?: unknown;
  readonly cookieHeader?: string;
  readonly extraHeaders?: Readonly<Record<string, string>>;
  readonly clientAddress?: string;
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
  return app.request(
    `${TEST_HOST}${path}`,
    init,
    lambdaEnvironmentFrom(options.clientAddress ?? DEFAULT_CLIENT_ADDRESS),
  );
}

export async function readJson<Output>(
  response: Response,
  schema: z.ZodType<Output>,
): Promise<Output> {
  return schema.parse(await response.json());
}
