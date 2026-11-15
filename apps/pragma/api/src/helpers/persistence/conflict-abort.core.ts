import { z } from 'zod';

const CONFLICT_ABORT_CODES: ReadonlySet<string | null> = new Set<string | null>([
  'OC000',
  'OC001',
  '40001',
]);
const CONFLICT_ABORT_IN_MESSAGE = /\((OC00[01])\)/u;
const UNIQUE_VIOLATION_CODES: ReadonlySet<string | null> = new Set<string | null>(['23505']);

export const CONFLICTED_WRITE_MAX_ATTEMPTS = 5;
const FIRST_CONFLICT_RETRY_DELAY_MS = 100;
const CONFLICT_RETRY_DELAY_GROWTH = 2;

export type Wait = (milliseconds: number) => Promise<void>;

export function conflictRetryDelayAfter(attempt: number): number {
  return FIRST_CONFLICT_RETRY_DELAY_MS * CONFLICT_RETRY_DELAY_GROWTH ** (attempt - 1);
}

const codeSchema = z.object({ code: z.string() });
const messageSchema = z.object({ message: z.string() });
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
  if (hasCodeAmong(error, CONFLICT_ABORT_CODES)) return true;
  const withMessage = messageSchema.safeParse(error);
  return withMessage.success && CONFLICT_ABORT_IN_MESSAGE.test(withMessage.data.message);
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
  wait: Wait,
  attempt = 1,
): Promise<Result> {
  try {
    return await write();
  } catch (error) {
    const isRetried = isWorthRetrying(error, attempt);
    if (!isRetried) throw error;
    await wait(conflictRetryDelayAfter(attempt));
    return await retryingConflictAborts(write, wait, attempt + 1);
  }
}

export interface RetriedStatement<Rows, Values> extends PromiseLike<Rows> {
  values(): Promise<Values>;
}

export interface StartedStatement<Rows, Values> extends PromiseLike<Rows> {
  values(): PromiseLike<Values>;
}

export function retryingStatement<Rows, Values>(
  start: () => StartedStatement<Rows, Values>,
  wait: Wait,
): RetriedStatement<Rows, Values> {
  return {
    // eslint-disable-next-line unicorn/no-thenable -- Drizzle awaits a postgres.js statement or calls its values(), and a statement starts only then, so the retried one must be a lazy thenable too
    then: (onFulfilled, onRejected) =>
      retryingConflictAborts(async () => await start(), wait).then(onFulfilled, onRejected),
    values: async () => await retryingConflictAborts(async () => await start().values(), wait),
  };
}

type UnsafeStatementRunner = (...statement: never[]) => StartedStatement<unknown, unknown>;
type TransactionRunner = (...transaction: never[]) => Promise<unknown>;

export function retryingConflictAbortsOf<
  Client extends { unsafe: UnsafeStatementRunner; begin: TransactionRunner },
>(client: Client, wait: Wait): Client {
  return new Proxy(client, {
    get(target, property, receiver): unknown {
      if (property === 'unsafe') {
        return (...statement: Parameters<Client['unsafe']>) =>
          retryingStatement(() => target.unsafe(...statement), wait);
      }
      if (property === 'begin') {
        return async (...transaction: Parameters<Client['begin']>) =>
          await retryingConflictAborts(async () => await target.begin(...transaction), wait);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
