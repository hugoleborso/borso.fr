const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const SHARED_PASSWORD_WINDOW_MINUTES = 60;

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS =
  RATE_LIMIT_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const SHARED_PASSWORD_MAX_ATTEMPTS = 3;
export const SHARED_PASSWORD_WINDOW_MS =
  SHARED_PASSWORD_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export interface RateLimitBudget {
  readonly maxAttempts: number;
  readonly windowMs: number;
}

export const MEMBER_LOGIN_BUDGET: RateLimitBudget = {
  maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: RATE_LIMIT_WINDOW_MS,
};

export const SHARED_PASSWORD_BUDGET: RateLimitBudget = {
  maxAttempts: SHARED_PASSWORD_MAX_ATTEMPTS,
  windowMs: SHARED_PASSWORD_WINDOW_MS,
};

export interface RateBucket {
  attempts: number;
  windowStartedAt: number;
}

export interface BucketStore {
  read(ipHash: string): RateBucket | undefined;
  write(ipHash: string, bucket: RateBucket): void;
  clear(ipHash: string): void;
}

export function createBucketStore(): BucketStore {
  const map = new Map<string, RateBucket>();
  return {
    read(ipHash) {
      return map.get(ipHash);
    },
    write(ipHash, bucket) {
      map.set(ipHash, bucket);
    },
    clear(ipHash) {
      map.delete(ipHash);
    },
  };
}

// @FollowsBlueprint utils-pure-module
export function recordAttempt(
  existing: RateBucket | undefined,
  nowMillis: number,
  budget: RateLimitBudget,
): RateBucket {
  if (existing === undefined || nowMillis - existing.windowStartedAt >= budget.windowMs) {
    return { attempts: 1, windowStartedAt: nowMillis };
  }
  return { attempts: existing.attempts + 1, windowStartedAt: existing.windowStartedAt };
}

export function isRateLimited(bucket: RateBucket | undefined, budget: RateLimitBudget): boolean {
  if (bucket === undefined) return false;
  return bucket.attempts > budget.maxAttempts;
}
