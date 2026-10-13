import type { MiddlewareHandler } from 'hono';
import {
  bucketKeyFor,
  type BucketStore,
  createBucketStore,
  isRateLimited,
  type RateLimitBudget,
} from '../auth/rate-limit.utils';
import { readClientAddress } from '../helpers/client-address/client-address.environment';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const AUDIENCE_WINDOW_MINUTES = 1;
const AUDIENCE_WINDOW_MS = AUDIENCE_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const AUDIENCE_SEARCH_BUDGET: RateLimitBudget = {
  scope: 'audience-search',
  maxAttempts: 120,
  windowMs: AUDIENCE_WINDOW_MS,
};

export const AUDIENCE_WRITE_BUDGET: RateLimitBudget = {
  scope: 'audience-write',
  maxAttempts: 600,
  windowMs: AUDIENCE_WINDOW_MS,
};

/**
 * @Blueprint middleware-public-rate-limit
 * @BlueprintName Middleware Rate Limiting A Public Route
 * @BlueprintUsage Use for an unauthenticated route that reaches an external service or writes, where one address must not be able to hammer it.
 * @BlueprintDescription Reuses the sign-in slice's pure bucket arithmetic with a budget handed in rather than its own copy of the maths, keys the bucket on the address from `readClientAddress` rather than on any header a client writes, hashes it so no request stores one, and keeps the buckets in a store the caller may hand in too, which is what lets a test drive the window without a clock. The store lives in the Lambda instance and evicts expired buckets once it holds many, so its memory stays bounded; that also makes the budget per instance rather than global, which is acceptable here and not on sign-in, because a room sharing one address would otherwise be one database row every guest writes at once. One built handler owns one set of buckets, so routes meant to share a budget share an instance and routes meant to be independent get their own. Every budget here is deliberately wide, because a venue behind one address is a whole room sharing one bucket: this bars a script, not a crowd.
 */
export function buildAudienceRateLimiter(
  budget: RateLimitBudget,
  bucketStore: BucketStore = createBucketStore(),
  clock: () => Date = () => new Date(),
): MiddlewareHandler {
  return async (context, next) => {
    const bucketKey = bucketKeyFor(budget, readClientAddress(context));
    const bucket = bucketStore.record(bucketKey, clock().getTime(), budget);
    if (isRateLimited(bucket, budget)) {
      return context.json({ error: 'rate-limited' }, 429);
    }
    await next();
    return;
  };
}
