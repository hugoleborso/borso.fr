const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const RATE_LIMIT_WINDOW_MINUTES = 15;

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS =
  RATE_LIMIT_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

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
export function recordAttempt(existing: RateBucket | undefined, nowMillis: number): RateBucket {
  if (existing === undefined || nowMillis - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    return { attempts: 1, windowStartedAt: nowMillis };
  }
  return { attempts: existing.attempts + 1, windowStartedAt: existing.windowStartedAt };
}

export function isRateLimited(bucket: RateBucket | undefined): boolean {
  if (bucket === undefined) return false;
  return bucket.attempts > RATE_LIMIT_MAX_ATTEMPTS;
}
