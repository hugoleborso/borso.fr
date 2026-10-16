import { z } from 'zod';
import { isTalosError } from '../helpers/errors/talos-error.types';
import type { OperationChunk } from './memory-changes.core';

const OPERATION_STATUSES = ['created', 'updated', 'unchanged'] as const;
const UNEXPECTED_FAILURE = 'erreur inattendue';

const operationResultSchema = z.object({
  index: z.number(),
  op: z.string(),
  id: z.string().optional(),
  status: z.enum(OPERATION_STATUSES),
});

const storedResponseSchema = z.object({
  applied: z.number(),
  replayed: z.boolean(),
  results: z.array(operationResultSchema),
  chunks: z.array(z.object({ from: z.number(), to: z.number(), committed: z.boolean() })),
  error: z.string().optional(),
});

export type OperationStatus = (typeof OPERATION_STATUSES)[number];
export type OperationResult = z.infer<typeof operationResultSchema>;
export type ChangeResponse = z.infer<typeof storedResponseSchema>;

// @FollowsBlueprint core-projection
export function composeChangeResponse(
  results: readonly OperationResult[],
  chunks: readonly OperationChunk[],
  committed: readonly boolean[],
  failure: unknown,
): ChangeResponse {
  return {
    applied: results.length,
    replayed: false,
    results: [...results],
    chunks: chunks.map((chunk, index) => ({ ...chunk, committed: committed[index] ?? false })),
    ...(failure === null ? {} : { error: describeFailure(failure) }),
  };
}

export function describeFailure(failure: unknown): string {
  if (isTalosError(failure)) return failure.detail.message ?? failure.code;
  return UNEXPECTED_FAILURE;
}

export function readStoredResponse(storedText: string): ChangeResponse {
  const stored: unknown = JSON.parse(storedText);
  return { ...storedResponseSchema.parse(stored), replayed: true };
}
