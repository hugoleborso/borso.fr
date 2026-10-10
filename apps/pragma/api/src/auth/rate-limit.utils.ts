import { createHash } from 'node:crypto';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const SHARED_PASSWORD_WINDOW_MINUTES = 60;
const BUCKET_KEY_SEPARATOR = '\n';

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS =
  RATE_LIMIT_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const SHARED_PASSWORD_MAX_ATTEMPTS = 3;
export const SHARED_PASSWORD_WINDOW_MS =
  SHARED_PASSWORD_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const MAXIMUM_BUCKETS_BEFORE_EVICTION = 1_000;

export interface RateLimitBudget {
  readonly scope: string;
  readonly maxAttempts: number;
  readonly windowMs: number;
}

export const MEMBER_LOGIN_BUDGET: RateLimitBudget = {
  scope: 'member-login',
  maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: RATE_LIMIT_WINDOW_MS,
};

export const SHARED_PASSWORD_BUDGET: RateLimitBudget = {
  scope: 'shared-password',
  maxAttempts: SHARED_PASSWORD_MAX_ATTEMPTS,
  windowMs: SHARED_PASSWORD_WINDOW_MS,
};

export interface RateBucket {
  readonly attempts: number;
  readonly windowStartedAt: number;
}

export function bucketKeyFor(budget: RateLimitBudget, clientAddress: string): string {
  return createHash('sha256')
    .update(`${budget.scope}${BUCKET_KEY_SEPARATOR}${clientAddress}`)
    .digest('hex');
}

export function windowFloorFor(now: Date, budget: RateLimitBudget): Date {
  return new Date(now.getTime() - budget.windowMs);
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

export interface BucketStore {
  record(bucketKey: string, nowMillis: number, budget: RateLimitBudget): RateBucket;
  size(): number;
}

function isExpired(bucket: RateBucket, nowMillis: number, budget: RateLimitBudget): boolean {
  return nowMillis - bucket.windowStartedAt >= budget.windowMs;
}

export function createBucketStore(): BucketStore {
  const buckets = new Map<string, RateBucket>();
  function evictExpired(nowMillis: number, budget: RateLimitBudget): void {
    if (buckets.size < MAXIMUM_BUCKETS_BEFORE_EVICTION) return;
    for (const [bucketKey, bucket] of buckets) {
      if (isExpired(bucket, nowMillis, budget)) buckets.delete(bucketKey);
    }
  }
  return {
    record(bucketKey, nowMillis, budget) {
      evictExpired(nowMillis, budget);
      const bucket = recordAttempt(buckets.get(bucketKey), nowMillis, budget);
      buckets.set(bucketKey, bucket);
      return bucket;
    },
    size() {
      return buckets.size;
    },
  };
}
