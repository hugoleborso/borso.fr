import { z } from 'zod';

const CONFLICT_ABORT_CODES: ReadonlySet<string | null> = new Set<string | null>(['OC000', '40001']);
const UNIQUE_VIOLATION_CODES: ReadonlySet<string | null> = new Set<string | null>(['23505']);

export const CONFLICTED_WRITE_MAX_ATTEMPTS = 3;

const codeSchema = z.object({ code: z.string() });
const causeSchema = z.object({ cause: z.unknown() });

function readErrorCode(error: unknown): string | null {
  const withCode = codeSchema.safeParse(error);
  return withCode.success ? withCode.data.code : null;
}

function hasCodeAmong(error: unknown, codes: ReadonlySet<string | null>): boolean {
  const ownCode = readErrorCode(error);
  if (ownCode !== null) return codes.has(ownCode);
  const withCause = causeSchema.safeParse(error);
  if (!withCause.success) return false;
  return codes.has(readErrorCode(withCause.data.cause));
}

// @FollowsBlueprint helper-module
export function isConflictAbort(error: unknown): boolean {
  return hasCodeAmong(error, CONFLICT_ABORT_CODES);
}

export function isUniqueViolation(error: unknown): boolean {
  return hasCodeAmong(error, UNIQUE_VIOLATION_CODES);
}

export function isLostInsertRace(error: unknown): boolean {
  return isUniqueViolation(error) || isConflictAbort(error);
}

export function isWorthRetrying(error: unknown, attempt: number): boolean {
  return attempt < CONFLICTED_WRITE_MAX_ATTEMPTS && isConflictAbort(error);
}

export async function retryingConflictAborts<Result>(
  write: () => Promise<Result>,
  attempt = 1,
): Promise<Result> {
  try {
    return await write();
  } catch (error) {
    const isRetried = isWorthRetrying(error, attempt);
    if (!isRetried) throw error;
    return await retryingConflictAborts(write, attempt + 1);
  }
}
