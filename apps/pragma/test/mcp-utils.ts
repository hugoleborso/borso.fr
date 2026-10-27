import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Hono } from 'hono';
import { afterAll, beforeAll, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../api/src/app';
import type { TaggedFailure } from '../api/src/helpers/observability/error-reporting.adapter';
import { NOTIFICATION_GROUP_WINDOW_MINUTES } from '../api/src/notifications/notifications.core';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  jsonRequest,
  readJson,
  TEST_HOST,
} from './auth-utils';
import { stubPushService, subscribeDevice } from './push-utils';

export const MCP_TEST_ISSUER = 'https://pragma.test';
const MCP_TEST_CONSENT_ORIGIN = 'https://site.pragma.test';
const MCP_URL = `${TEST_HOST}/mcp`;
const ASSISTANT_CALLBACK = 'http://127.0.0.1:47823/callback';
const RFC_7636_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_7636_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const OAUTH_VARIABLES = {
  OAUTH_ISSUER: MCP_TEST_ISSUER,
  OAUTH_CONSENT_ORIGIN: MCP_TEST_CONSENT_ORIGIN,
};

const registeredClientSchema = z.object({ client_id: z.string() });
const redirectToSchema = z.object({ redirectTo: z.string().url() });
const tokenSchema = z.object({ access_token: z.string(), refresh_token: z.string() });
const MILLISECONDS_PER_MINUTE = 60_000;
const textContentSchema = z.array(z.object({ type: z.literal('text'), text: z.string() }));

export interface AssistantHarness {
  readonly app: Hono;
  readonly clock: { now: Date };
  readonly advanceClock: (milliseconds: number) => void;
  readonly reportFailure: ReturnType<typeof vi.fn<(failure: TaggedFailure) => void>>;
}

export interface AssistantTokens {
  readonly clientId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface ToolReply {
  readonly isError: boolean;
  readonly body: unknown;
}

export interface AssistantBand {
  readonly harness: AssistantHarness;
  readonly hugo: AuthenticatedApp;
  readonly lea: AuthenticatedApp;
  readonly send: ReturnType<typeof stubPushService>;
  readonly assistant: Client;
}

export function useOAuthOrigins(): void {
  const preserved = new Map<string, string | undefined>();
  beforeAll(() => {
    for (const [name, value] of Object.entries(OAUTH_VARIABLES)) {
      preserved.set(name, process.env[name]);
      process.env[name] = value;
    }
  });
  afterAll(() => {
    for (const [name, value] of preserved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

export function buildAssistantHarness(): AssistantHarness {
  const clock = { now: new Date() };
  const reportFailure = vi.fn<(failure: TaggedFailure) => void>();
  const readClock = () => clock.now;
  const app = createApp({
    oauth: { clock: readClock, reportFailure },
    mcp: { clock: readClock, reportFailure },
  });
  const advanceClock = (milliseconds: number) => {
    clock.now = new Date(clock.now.getTime() + milliseconds);
  };
  return { app, clock, advanceClock, reportFailure };
}

export async function connectAssistant(
  app: Hono,
  member: AuthenticatedApp,
): Promise<AssistantTokens> {
  const registration = await jsonRequest(app, '/oauth/register', {
    method: 'POST',
    body: { client_name: 'Claude Code', redirect_uris: [ASSISTANT_CALLBACK] },
  });
  const clientId = (await readJson(registration, registeredClientSchema)).client_id;
  const consent = await jsonRequest(app, '/api/oauth/consent', {
    method: 'POST',
    cookieHeader: member.cookieHeader,
    body: {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: ASSISTANT_CALLBACK,
      code_challenge: RFC_7636_CHALLENGE,
      code_challenge_method: 'S256',
      decision: 'allow',
    },
  });
  const { redirectTo } = await readJson(consent, redirectToSchema);
  const code = new URL(redirectTo).searchParams.get('code');
  if (code === null) throw new Error(`consent answered no code: ${redirectTo}`);
  const tokenResponse = await app.request(`${TEST_HOST}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: ASSISTANT_CALLBACK,
      code_verifier: RFC_7636_VERIFIER,
    }).toString(),
  });
  const tokens = await readJson(tokenResponse, tokenSchema);
  return { clientId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
}

export async function openMcpClient(
  app: Hono,
  accessToken: string,
  observeResponse: (response: Response) => void = () => undefined,
): Promise<Client> {
  const client = new Client({ name: 'pragma-e2e', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
      fetch: async (url, init) => {
        const response = await app.request(url.toString(), init);
        observeResponse(response);
        return response;
      },
    }),
  );
  return client;
}

export async function callTool(
  client: Client,
  name: string,
  toolArguments: Record<string, unknown> = {},
): Promise<ToolReply> {
  const reply = await client.callTool({ name, arguments: toolArguments });
  const [content] = textContentSchema.parse(reply.content);
  const text = content?.text ?? '';
  return { isError: reply.isError === true, body: parseToolText(text) };
}

function parseToolText(text: string): unknown {
  try {
    const body: unknown = JSON.parse(text);
    return body;
  } catch {
    return text;
  }
}

export async function postToMcp(
  app: Hono,
  body: unknown,
  authorization?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (authorization !== undefined) headers.authorization = authorization;
  return await app.request(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
}

export async function prepareAssistantBand(): Promise<AssistantBand> {
  const send = stubPushService();
  const harness = buildAssistantHarness();
  const hugo = await buildAuthenticatedApp('Hugo');
  const lea = await buildAuthenticatedApp('Léa');
  await subscribeDevice(hugo, 'hugo-phone');
  await subscribeDevice(lea, 'lea-phone');
  const tokens = await connectAssistant(harness.app, hugo);
  const assistant = await openMcpClient(harness.app, tokens.accessToken);
  return { harness, hugo, lea, send, assistant };
}

export function passNotificationGroupWindow(harness: AssistantHarness): void {
  const windowMilliseconds = (NOTIFICATION_GROUP_WINDOW_MINUTES + 1) * MILLISECONDS_PER_MINUTE;
  harness.advanceClock(windowMilliseconds);
}
