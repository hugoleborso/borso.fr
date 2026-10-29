import type { Context } from 'hono';
import { type AnyZodObject, z, type ZodTypeAny } from 'zod';
import { reportTaggedFailure } from '../helpers/observability/error-reporting.adapter';
import {
  isIdentifierReference,
  type ReferenceCandidate,
} from '../helpers/reference/reference.core';
import { answerMcpRequest, type McpSession } from './mcp-server.adapter';
import type {
  DeletionToolDefinition,
  ToolDefinition,
  ToolDeletion,
  ToolRefusal,
} from './mcp.types';
import { referenceSchema } from './tool-input.schema';
import {
  describeInvalidFields,
  describeUnresolvedReference,
  pickReference,
  ToolRefusedError,
  type UnresolvedReference,
} from './tool-refusal.core';

export type { ToolActor, ToolAnswer, ToolDefinition, ToolDeletion } from './mcp.types';
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

export function defineDeletion(deletion: ToolDeletion): ToolDeletion {
  return deletion;
}

export function defineDeletionTool<Kind extends string>(
  definition: DeletionToolDefinition<Kind>,
): ToolDefinition {
  const [firstKind, ...otherKinds] = definition.kinds;
  const kindSchema: z.ZodType<string> = z.enum(definition.kinds);
  const deletionByKind = new Map<string, ToolDeletion>(
    definition.kinds.map((kind) => [kind, definition.deletions[kind]]),
  );
  return defineTool({
    name: definition.name,
    description: definition.description,
    routes: [
      definition.deletions[firstKind].route,
      ...otherKinds.map((kind) => definition.deletions[kind].route),
    ],
    inputSchema: z.object({ kind: kindSchema, id: referenceSchema }),
    run: async ({ kind, id }, actor) => {
      const deletion = deletionByKind.get(kind);
      if (deletion === undefined) return refuseTool({ error: 'unknown-kind', kind });
      return await deletion.remove(id, actor);
    },
  });
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

export function parseToolFields<Schema extends ZodTypeAny>(
  schema: Schema,
  fields: unknown,
): z.output<Schema> {
  const checkedFields: z.SafeParseReturnType<z.input<Schema>, z.output<Schema>> = schema.safeParse(
    fields,
  );
  if (checkedFields.success) return checkedFields.data;
  return refuseTool(describeInvalidFields(checkedFields.error.issues));
}
