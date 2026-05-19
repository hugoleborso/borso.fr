/**
 * Per-`ip_hash` token-bucket rate limit. See ADR-0004 — five tries per
 * fifteen-minute sliding window. The bucket lives in memory inside the
 * Lambda container; cold starts wipe it. Accepted inconsistency: five
 * band members behind at most a couple of NATs.
 *
 * Implementation: a fixed window. Each `recordAttempt(ipHash, now)`
 * increments the counter; when `now` is past the window end, the
 * counter resets and the new window begins at `now`.
 *
 * Pure helpers — no I/O — exposed for unit testing. The bucket store
 * itself is also exposed so the middleware can swap it for a test
 * double; `createBucketStore()` is the production factory.
 */

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

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

/**
 * Returns the bucket reflecting the attempt — its `attempts` field
 * indicates the new count. Caller decides whether to allow or reject
 * the action; if rejecting, the bucket is still updated so repeated
 * failed checks count against the same window.
 */
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
