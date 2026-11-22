import { z } from 'zod';

const CONFLICT_ABORT_CODES: ReadonlySet<string> = new Set(['OC000', 'OC001', '40001']);
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
  if (!withCause.success) return false;
  const causeCode = readErrorCode(withCause.data.cause);
  return causeCode !== null && CONFLICT_ABORT_CODES.has(causeCode);
}

// @FollowsBlueprint helper-module
export function isConflictAbort(error: unknown): boolean {
  if (hasConflictCode(error)) return true;
  const withMessage = messageSchema.safeParse(error);
  return withMessage.success && CONFLICT_ABORT_IN_MESSAGE.test(withMessage.data.message);
}
