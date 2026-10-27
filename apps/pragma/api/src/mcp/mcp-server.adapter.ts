import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Context } from 'hono';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import type { ToolActor, ToolDefinition, ToolResult } from './mcp.types';
import {
  selectFailureCode,
  selectToolOutcome,
  shapeToolFailure,
  shapeToolResult,
} from './tool-result.core';

const SERVER_IDENTITY = { name: 'pragma', version: '1.0.0' };
const TOOL_FAILURE = 'McpToolFailed';
const TOOL_CALLED_EVENT = 'mcp_tool_called';
const NOTHING_TO_ANSWER_STATUS = 202;

export interface McpSession {
  readonly tools: readonly ToolDefinition[];
  readonly actor: ToolActor;
  readonly reportFailure: (failure: TaggedFailure) => void;
}

async function runTool(
  tool: ToolDefinition,
  input: Parameters<ToolDefinition['run']>[0],
  session: McpSession,
): Promise<ToolResult> {
  try {
    const answer = await tool.run(input, session.actor);
    recordProductEvent({
      event: TOOL_CALLED_EVENT,
      tool: tool.name,
      outcome: selectToolOutcome(answer),
    });
    return shapeToolResult(answer);
  } catch (error) {
    console.error(error);
    session.reportFailure({
      name: TOOL_FAILURE,
      tags: { 'mcp.tool': tool.name, 'mcp.code': selectFailureCode(error) },
    });
    recordProductEvent({ event: TOOL_CALLED_EVENT, tool: tool.name, outcome: 'failed' });
    return shapeToolFailure();
  }
}

// @FollowsBlueprint adapter-external-service
export function buildMcpServer(session: McpSession): McpServer {
  const server = new McpServer(SERVER_IDENTITY);
  for (const tool of session.tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (input) => ({ ...(await runTool(tool, input, session)) }),
    );
  }
  return server;
}

export async function answerMcpRequest(context: Context, session: McpSession): Promise<Response> {
  const server = buildMcpServer(session);
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(context);
    return response ?? context.body(null, NOTHING_TO_ANSWER_STATUS);
  } finally {
    await server.close();
  }
}
