import type { Context } from 'hono';
import type { AnyZodObject } from 'zod';
import { reportTaggedFailure } from '../helpers/observability/error-reporting.adapter';
import {
  isIdentifierReference,
  type ReferenceCandidate,
} from '../helpers/reference/reference.core';
import { answerMcpRequest, type McpSession } from './mcp-server.adapter';
import type { ToolDefinition, ToolRefusal } from './mcp.types';
import {
  describeUnresolvedReference,
  pickReference,
  ToolRefusedError,
  type UnresolvedReference,
} from './tool-refusal.core';

export type { ToolActor, ToolAnswer, ToolDefinition } from './mcp.types';
export type { ReferenceCandidate } from '../helpers/reference/reference.core';
export { pageItems } from './tool-page.core';
export { confirmUpdate } from './tool-confirmation.core';
export { pickReference } from './tool-refusal.core';

export const reportToolFailureToErrorTracking: McpSession['reportFailure'] = reportTaggedFailure;

// @FollowsBlueprint service-passthrough
export function defineTool<Schema extends AnyZodObject>(
  definition: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return definition;
}

export function refuseTool(body: ToolRefusal): never {
  throw new ToolRefusedError(body);
}

export function refuseUnresolvedReference(
  noun: string,
  reference: string,
  match: UnresolvedReference,
): never {
  return refuseTool(describeUnresolvedReference(noun, reference, match));
}

export async function resolveReference(
  noun: string,
  reference: string,
  listCandidates: () => Promise<readonly ReferenceCandidate[]>,
): Promise<string> {
  const isIdentifier = isIdentifierReference(reference);
  if (isIdentifier) return reference;
  return pickReference(noun, await listCandidates(), reference);
}

export async function answerToolRequest(context: Context, session: McpSession): Promise<Response> {
  return await answerMcpRequest(context, session);
}
