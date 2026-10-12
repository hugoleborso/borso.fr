import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Hono } from 'hono';
import { createApp } from '../api/src/app';
import { insertSession } from '../api/src/auth/auth.repository';
import { buildSessionCookie, SESSION_COOKIE_NAME } from '../api/src/auth/session-cookie.utils';
import { useContentStore } from '../api/src/content/content-store.setup';
import { createLocalContentStore } from '../api/src/content/local-content.adapter';
import { type SecretName, useSecretReader } from '../api/src/helpers/secrets/secrets.setup';

export const TEST_HOST = 'http://localhost';
export const TEST_SECRETS: Partial<Record<SecretName, string>> = {
  'session-hmac': 'test-session-hmac',
  'bootstrap-code': 'code-de-test',
  'notify-secret': 'secret-de-notification',
  'vapid-public':
    'BETuWdutrn7_RTt1NXs7g5lGCtPBs9g7cfeZlYtFmaSaDzDaWnPnBfWCZFxi8lBChY9S6kMLWGySeXdwmyv9LQ4',
  'vapid-private': '1QIrIuxi_wMMNHRAiyIY6XKW6UsnRDmf38w-yg13VxU',
};

export interface TestContext {
  readonly app: Hono;
  readonly overlay: Map<string, string>;
  readonly root: string;
}

// @FollowsBlueprint test-fixtures-object-mother
export function useTestSecrets(overrides: Partial<Record<SecretName, string>> = {}): void {
  const secrets = { ...TEST_SECRETS, ...overrides };
  useSecretReader(async (name) => await Promise.resolve(secrets[name]));
}

export function buildTestContext(files: Readonly<Record<string, string>> = {}): TestContext {
  const root = mkdtempSync(join(tmpdir(), 'talos-content-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const overlay = new Map<string, string>();
  useContentStore(createLocalContentStore({ root, overlay }));
  useTestSecrets();
  return { app: createApp(), overlay, root };
}

export async function signIn(now = new Date()): Promise<string> {
  const sessionId = `session-${String(now.getTime())}-${String(Math.random()).slice(2)}`;
  await insertSession({
    id: sessionId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
  const cookie = buildSessionCookie(TEST_SECRETS['session-hmac'] ?? '', now.getTime(), sessionId);
  return `${SESSION_COOKIE_NAME}=${cookie}`;
}

export interface JsonRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly body?: unknown;
  readonly cookie?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export async function requestJson(
  app: Hono,
  path: string,
  options: JsonRequestOptions = {},
): Promise<Response> {
  return await app.request(`${TEST_HOST}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}
