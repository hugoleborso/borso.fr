const AUTHENTICATION_WINDOW_MINUTES = 15;
const AUTHENTICATION_MAXIMUM_ATTEMPTS = 10;

export interface RateLimitBudget {
  readonly maxAttempts: number;
  readonly windowMs: number;
}

export interface RateBucket {
  readonly attempts: number;
  readonly windowStartedAt: number;
}

export const AUTHENTICATION_BUDGET: RateLimitBudget = {
  maxAttempts: AUTHENTICATION_MAXIMUM_ATTEMPTS,
  windowMs: AUTHENTICATION_WINDOW_MINUTES * 60 * 1000,
};

// @FollowsBlueprint utils-pure-module
export function windowFloorFor(now: Date, budget: RateLimitBudget): Date {
  return new Date(now.getTime() - budget.windowMs);
}

export function isRateLimited(bucket: RateBucket, budget: RateLimitBudget): boolean {
  return bucket.attempts > budget.maxAttempts;
}
