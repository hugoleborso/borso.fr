import type { MiddlewareHandler } from 'hono';
import { hashIp, readClientIp } from '../auth/ip-hash.utils';
import {
  type BucketStore,
  createBucketStore,
  isRateLimited,
  type RateLimitBudget,
  recordAttempt,
} from '../auth/rate-limit.utils';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const AUDIENCE_WINDOW_MINUTES = 1;
const AUDIENCE_WINDOW_MS = AUDIENCE_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const AUDIENCE_SEARCH_BUDGET: RateLimitBudget = {
  maxAttempts: 120,
  windowMs: AUDIENCE_WINDOW_MS,
};

export const AUDIENCE_WRITE_BUDGET: RateLimitBudget = {
  maxAttempts: 600,
  windowMs: AUDIENCE_WINDOW_MS,
};

const FORWARDED_FOR_HEADER = 'x-forwarded-for';

/**
 * @Blueprint middleware-public-rate-limit
 * @BlueprintName Middleware Rate Limiting A Public Route
 * @BlueprintUsage Use for an unauthenticated route that reaches an external service or writes, where one address must not be able to hammer it.
 * @BlueprintDescription Reuses the sign-in slice's pure bucket arithmetic with a budget handed in rather than its own copy of the maths, hashes the address so no request stores one, and keeps the buckets in a store the caller may hand in too, which is what lets a test drive the window without a clock. One built handler owns one set of buckets, so routes meant to share a budget share an instance and routes meant to be independent get their own. Every budget here is deliberately wide, because a venue behind one address is a whole room sharing one bucket: this bars a script, not a crowd.
 */
export function buildAudienceRateLimiter(
  budget: RateLimitBudget,
  bucketStore: BucketStore = createBucketStore(),
  clock: () => Date = () => new Date(),
): MiddlewareHandler {
  return async (context, next) => {
    const ipHash = hashIp(readClientIp(context.req.header(FORWARDED_FOR_HEADER)));
    const bucket = recordAttempt(bucketStore.read(ipHash), clock().getTime(), budget);
    bucketStore.write(ipHash, bucket);
    if (isRateLimited(bucket, budget)) {
      return context.json({ error: 'rate-limited' }, 429);
    }
    await next();
    return;
  };
}
