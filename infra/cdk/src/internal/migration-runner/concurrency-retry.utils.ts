const CONCURRENCY_CONFLICT_CODES: ReadonlySet<string> = new Set(['OC000', 'OC001', '40001']);
const CONCURRENCY_CONFLICT_IN_MESSAGE = /\((OC00[01])\)/u;

export const CONCURRENCY_RETRY_MAX_ATTEMPTS = 5;
const FIRST_RETRY_DELAY_MILLISECONDS = 2_000;
const RETRY_DELAY_GROWTH = 2;

export interface ConcurrencyRetryStep {
  readonly isRetried: boolean;
  readonly delayMilliseconds: number;
}

function readField(error: unknown, field: 'code' | 'message'): unknown {
  return typeof error === 'object' && error !== null ? Reflect.get(error, field) : undefined;
}

// @FollowsBlueprint utils-pure-module
export function isConcurrencyConflict(error: unknown): boolean {
  return (
    CONCURRENCY_CONFLICT_CODES.has(String(readField(error, 'code'))) ||
    CONCURRENCY_CONFLICT_IN_MESSAGE.test(String(readField(error, 'message')))
  );
}

export function planConcurrencyRetry(error: unknown, attempt: number): ConcurrencyRetryStep {
  const isRetried = attempt < CONCURRENCY_RETRY_MAX_ATTEMPTS && isConcurrencyConflict(error);
  return {
    isRetried,
    delayMilliseconds: isRetried
      ? FIRST_RETRY_DELAY_MILLISECONDS * RETRY_DELAY_GROWTH ** (attempt - 1)
      : 0,
  };
}
