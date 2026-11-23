import { z } from 'zod';

const CONFLICT_ABORT_CODES: ReadonlySet<string | null> = new Set(['OC000', 'OC001', '40001']);
const CONFLICT_ABORT_IN_MESSAGE = /\((OC00[01])\)/u;

const codeSchema = z.object({ code: z.string() });
const messageSchema = z.object({ message: z.string() });
const causeSchema = z.object({ cause: z.unknown() });

function readErrorCode(error: unknown): string | null {
  const withCode = codeSchema.safeParse(error);
  return withCode.success ? withCode.data.code : null;
}

function hasConflictCode(error: unknown): boolean {
  const ownCode = readErrorCode(error);
  if (ownCode !== null) return CONFLICT_ABORT_CODES.has(ownCode);
  const withCause = causeSchema.safeParse(error);
  return withCause.success && CONFLICT_ABORT_CODES.has(readErrorCode(withCause.data.cause));
}

// @FollowsBlueprint helper-module
export function isConflictAbort(error: unknown): boolean {
  if (hasConflictCode(error)) return true;
  const withMessage = messageSchema.safeParse(error);
  return withMessage.success && CONFLICT_ABORT_IN_MESSAGE.test(withMessage.data.message);
}

export async function retryOnConflictAbort<Result>(
  operation: () => Promise<Result>,
  retries: number,
): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isConflictAbort(error)) {
      return await retryOnConflictAbort(operation, retries - 1);
    }
    throw error;
  }
}
