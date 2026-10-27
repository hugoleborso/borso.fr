import type { Context } from 'hono';
import type { AnyZodObject } from 'zod';
import { reportTaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { answerMcpRequest, type McpSession } from './mcp-server.adapter';
import type { ToolDefinition } from './mcp.types';

export type { ToolActor, ToolAnswer, ToolDefinition } from './mcp.types';

export const reportToolFailureToErrorTracking: McpSession['reportFailure'] = reportTaggedFailure;

// @FollowsBlueprint service-passthrough
export function defineTool<Schema extends AnyZodObject>(
  definition: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return definition;
}

export async function answerToolRequest(context: Context, session: McpSession): Promise<Response> {
  return await answerMcpRequest(context, session);
}
