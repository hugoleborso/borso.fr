import { z } from 'zod';

const CONFLICT_ABORT_CODES: ReadonlySet<string | null> = new Set<string | null>(['OC000', '40001']);

export const CONFLICTED_WRITE_MAX_ATTEMPTS = 3;

const codeSchema = z.object({ code: z.string() });
const causeSchema = z.object({ cause: z.unknown() });

function readErrorCode(error: unknown): string | null {
  const withCode = codeSchema.safeParse(error);
  return withCode.success ? withCode.data.code : null;
}

// @FollowsBlueprint helper-module
export function isConflictAbort(error: unknown): boolean {
  const ownCode = readErrorCode(error);
  if (ownCode !== null) return CONFLICT_ABORT_CODES.has(ownCode);
  const withCause = causeSchema.safeParse(error);
  if (!withCause.success) return false;
  return CONFLICT_ABORT_CODES.has(readErrorCode(withCause.data.cause));
}

export function isWorthRetrying(error: unknown, attempt: number): boolean {
  return attempt < CONFLICTED_WRITE_MAX_ATTEMPTS && isConflictAbort(error);
}
