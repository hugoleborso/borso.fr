/**
 * @vitest-environment node
 */

import { StreamableHTTPTransport } from '@hono/mcp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { answerMcpRequest } from './mcp-server.adapter';
import type { ToolActor, ToolDefinition } from './mcp.types';

const SERVER_URL = 'http://localhost/mcp';
const ACTOR: ToolActor = {
  memberId: '00000000-0000-4000-8000-000000000001',
  now: new Date('2026-10-27T10:00:00.000Z'),
};
const echoInputSchema = z.object({ title: z.string().min(1) });

const ECHO_TOOL: ToolDefinition<typeof echoInputSchema> = {
  name: 'echo_title',
  description: 'Answers the title it was given.',
  route: 'POST /api/echo',
  inputSchema: echoInputSchema,
  run: async ({ title }, actor) =>
    await Promise.resolve({ kind: 'answered', body: { title, memberId: actor.memberId } }),
};
const REFUSING_TOOL: ToolDefinition = {
  name: 'refuse',
  description: 'Always refuses.',
  route: 'GET /api/refuse',
  inputSchema: z.object({}),
  run: async () => await Promise.resolve({ kind: 'refused', body: { error: 'not-found' } }),
};
const THROWING_TOOL: ToolDefinition = {
  name: 'explode',
  description: 'Always throws.',
  route: 'GET /api/explode',
  inputSchema: z.object({}),
  run: async () => await Promise.reject(new RangeError('database went away')),
};

const toolEventSchema = z.object({ event: z.literal('mcp_tool_called'), tool: z.string() });

function buildServerApp(reportFailure: (failure: TaggedFailure) => void): Hono {
  return new Hono().post('/mcp', async (context) =>
    answerMcpRequest(context, {
      tools: [ECHO_TOOL, REFUSING_TOOL, THROWING_TOOL],
      actor: ACTOR,
      reportFailure,
    }),
  );
}

async function connectClient(app: Hono): Promise<Client> {
  const client = new Client({ name: 'adapter-test', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(SERVER_URL), {
      fetch: async (url, init) => await app.request(url.toString(), init),
    }),
  );
  return client;
}

function parseLine(line: unknown): unknown {
  if (typeof line !== 'string') return null;
  const productEvent: unknown = JSON.parse(line);
  return productEvent;
}

interface RecordedWrites {
  readonly mock: { readonly calls: readonly (readonly unknown[])[] };
}

function readToolEvents(write: RecordedWrites): unknown[] {
  return write.mock.calls
    .map(([line]) => parseLine(line))
    .filter((event) => toolEventSchema.safeParse(event).success);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-node-adapter
describe('answerMcpRequest', () => {
  it('lists every tool with its input schema and advertises tools only', async () => {
    const client = await connectClient(buildServerApp(vi.fn()));

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(['echo_title', 'refuse', 'explode']);
    expect(tools[0]?.inputSchema).toMatchObject({
      type: 'object',
      properties: { title: { type: 'string', minLength: 1 } },
      required: ['title'],
    });
    expect(Object.keys(client.getServerCapabilities() ?? {})).toEqual(['tools']);
  });

  it('runs a tool as the actor and answers its body as JSON text', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const client = await connectClient(buildServerApp(vi.fn()));

    const echoed = await client.callTool({ name: 'echo_title', arguments: { title: 'Creep' } });

    expect(echoed).toEqual({
      content: [{ type: 'text', text: `{"title":"Creep","memberId":"${ACTOR.memberId}"}` }],
    });
    expect(readToolEvents(write)).toEqual([
      { event: 'mcp_tool_called', tool: 'echo_title', outcome: 'ok' },
    ]);
  });

  it('answers a refusal as a tool error carrying the route error body', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const client = await connectClient(buildServerApp(vi.fn()));

    const refusal = await client.callTool({ name: 'refuse', arguments: {} });

    expect(refusal).toEqual({
      isError: true,
      content: [{ type: 'text', text: '{"error":"not-found"}' }],
    });
    expect(readToolEvents(write)).toEqual([
      { event: 'mcp_tool_called', tool: 'refuse', outcome: 'refused' },
    ]);
  });

  it('reports a thrown tool as McpToolFailed and answers an internal error', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const reportFailure = vi.fn<(failure: TaggedFailure) => void>();
    const client = await connectClient(buildServerApp(reportFailure));

    const failure = await client.callTool({ name: 'explode', arguments: {} });

    expect(failure).toEqual({
      isError: true,
      content: [{ type: 'text', text: '{"error":"internal-error"}' }],
    });
    expect(reportFailure).toHaveBeenCalledExactlyOnceWith({
      name: 'McpToolFailed',
      tags: { 'mcp.tool': 'explode', 'mcp.code': 'RangeError' },
    });
    expect(readToolEvents(write)).toEqual([
      { event: 'mcp_tool_called', tool: 'explode', outcome: 'failed' },
    ]);
  });

  it('answers an argument the schema refuses with an error naming the field', async () => {
    const client = await connectClient(buildServerApp(vi.fn()));

    const schemaRefusal = await client.callTool({ name: 'echo_title', arguments: {} });

    expect(schemaRefusal.isError).toBe(true);
    expect(JSON.stringify(schemaRefusal.content)).toContain('title');
  });

  it('closes the per-request server once the answer is written, keeping no state between calls', async () => {
    const close = vi.spyOn(McpServer.prototype, 'close');
    const client = await connectClient(buildServerApp(vi.fn()));
    const closesAfterConnecting = close.mock.calls.length;

    await client.listTools();

    expect(closesAfterConnecting).toBeGreaterThan(0);
    expect(close).toHaveBeenCalledTimes(closesAfterConnecting + 1);
  });

  it('answers 202 with no body when the transport has nothing to send', async () => {
    vi.spyOn(StreamableHTTPTransport.prototype, 'handleRequest').mockResolvedValue(undefined);
    const app = buildServerApp(vi.fn());

    const response = await app.request(SERVER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });

    expect(response.status).toBe(202);
    expect(await response.text()).toBe('');
  });
});
