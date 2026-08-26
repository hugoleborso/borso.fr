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
const AUDIENCE_SEARCH_WINDOW_MINUTES = 1;

export const AUDIENCE_SEARCH_BUDGET: RateLimitBudget = {
  maxAttempts: 120,
  windowMs: AUDIENCE_SEARCH_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
};

const FORWARDED_FOR_HEADER = 'x-forwarded-for';

/**
 * @Blueprint middleware-public-rate-limit
 * @BlueprintName Middleware Rate Limiting A Public Route
 * @BlueprintUsage Use for an unauthenticated route that reaches an external service or writes, where one address must not be able to hammer it.
 * @BlueprintDescription Reuses the sign-in slice's pure bucket arithmetic with its own budget rather than its own copy of the maths, hashes the address so no request stores one, and keeps the buckets in a store the caller may hand in, which is what lets a test drive the window without a clock. The budget is deliberately wide, because a venue behind one address is a whole room sharing one bucket: this bars a script, not a crowd.
 */
export function buildAudienceSearchLimiter(
  bucketStore: BucketStore = createBucketStore(),
  clock: () => Date = () => new Date(),
): MiddlewareHandler {
  return async (context, next) => {
    const ipHash = hashIp(readClientIp(context.req.header(FORWARDED_FOR_HEADER)));
    const bucket = recordAttempt(
      bucketStore.read(ipHash),
      clock().getTime(),
      AUDIENCE_SEARCH_BUDGET,
    );
    bucketStore.write(ipHash, bucket);
    if (isRateLimited(bucket, AUDIENCE_SEARCH_BUDGET)) {
      return context.json({ error: 'rate-limited' }, 429);
    }
    await next();
    return;
  };
}
