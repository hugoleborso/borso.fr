import { describe, expect, it } from 'vitest';
import {
  createBucketStore,
  isRateLimited,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  recordAttempt,
  SHARED_PASSWORD_BUDGET,
} from './rate-limit.utils';

const A_WIDER_BUDGET = { maxAttempts: 60, windowMs: 60_000 };

// @FollowsBlueprint test-pure-unit
describe('rate-limit.utils', () => {
  describe('recordAttempt', () => {
    it('opens a fresh window when no bucket exists', () => {
      const bucket = recordAttempt(undefined, 1000, SHARED_PASSWORD_BUDGET);
      expect(bucket).toEqual({ attempts: 1, windowStartedAt: 1000 });
    });

    it('increments inside the current window', () => {
      const opened = recordAttempt(undefined, 1000, SHARED_PASSWORD_BUDGET);
      const next = recordAttempt(opened, 2000, SHARED_PASSWORD_BUDGET);
      expect(next).toEqual({ attempts: 2, windowStartedAt: 1000 });
    });

    it('increments inside the current window at epoch-scale timestamps', () => {
      const windowStartedAt = 1_700_000_000_000;
      const next = recordAttempt(
        { attempts: 1, windowStartedAt },
        windowStartedAt + 1000,
        SHARED_PASSWORD_BUDGET,
      );
      expect(next).toEqual({ attempts: 2, windowStartedAt });
    });

    it('opens a fresh window once the previous window expires', () => {
      const opened = recordAttempt(undefined, 1000, SHARED_PASSWORD_BUDGET);
      const fresh = recordAttempt(opened, 1000 + RATE_LIMIT_WINDOW_MS, SHARED_PASSWORD_BUDGET);
      expect(fresh).toEqual({ attempts: 1, windowStartedAt: 1000 + RATE_LIMIT_WINDOW_MS });
    });
  });

  describe('isRateLimited', () => {
    it('returns false when no bucket exists', () => {
      expect(isRateLimited(undefined, SHARED_PASSWORD_BUDGET)).toBe(false);
    });

    it('returns false at the maximum allowed attempts', () => {
      expect(
        isRateLimited(
          { attempts: RATE_LIMIT_MAX_ATTEMPTS, windowStartedAt: 0 },
          SHARED_PASSWORD_BUDGET,
        ),
      ).toBe(false);
    });

    it('returns true beyond the maximum allowed attempts', () => {
      expect(
        isRateLimited(
          { attempts: RATE_LIMIT_MAX_ATTEMPTS + 1, windowStartedAt: 0 },
          SHARED_PASSWORD_BUDGET,
        ),
      ).toBe(true);
    });
  });

  describe('a budget wider than the sign-in one', () => {
    it('lets through what the sign-in budget would refuse', () => {
      const bucket = { attempts: RATE_LIMIT_MAX_ATTEMPTS + 1, windowStartedAt: 0 };
      expect(isRateLimited(bucket, SHARED_PASSWORD_BUDGET)).toBe(true);
      expect(isRateLimited(bucket, A_WIDER_BUDGET)).toBe(false);
    });

    it('opens a fresh window on its own shorter window, not on the sign-in one', () => {
      const opened = recordAttempt(undefined, 1000, A_WIDER_BUDGET);
      const next = recordAttempt(opened, 1000 + A_WIDER_BUDGET.windowMs, A_WIDER_BUDGET);
      expect(next.attempts).toBe(1);
    });
  });

  describe('createBucketStore', () => {
    it('round-trips a value', () => {
      const store = createBucketStore();
      expect(store.read('alpha')).toBeUndefined();
      store.write('alpha', { attempts: 3, windowStartedAt: 100 });
      expect(store.read('alpha')).toEqual({ attempts: 3, windowStartedAt: 100 });
    });

    it('isolates entries per ipHash', () => {
      const store = createBucketStore();
      store.write('alpha', { attempts: 1, windowStartedAt: 100 });
      store.write('beta', { attempts: 2, windowStartedAt: 200 });
      expect(store.read('alpha')?.attempts).toBe(1);
      expect(store.read('beta')?.attempts).toBe(2);
    });

    it('clears an entry on demand', () => {
      const store = createBucketStore();
      store.write('alpha', { attempts: 4, windowStartedAt: 100 });
      store.clear('alpha');
      expect(store.read('alpha')).toBeUndefined();
    });
  });
});
