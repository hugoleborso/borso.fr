import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  createBucketStore,
  isRateLimited,
  recordAttempt,
} from './rate-limit.utils';

describe('rate-limit.utils', () => {
  describe('recordAttempt', () => {
    it('opens a fresh window when no bucket exists', () => {
      const bucket = recordAttempt(undefined, 1000);
      expect(bucket).toEqual({ attempts: 1, windowStartedAt: 1000 });
    });

    it('increments inside the current window', () => {
      const opened = recordAttempt(undefined, 1000);
      const next = recordAttempt(opened, 2000);
      expect(next).toEqual({ attempts: 2, windowStartedAt: 1000 });
    });

    it('opens a fresh window once the previous window expires', () => {
      const opened = recordAttempt(undefined, 1000);
      const fresh = recordAttempt(opened, 1000 + RATE_LIMIT_WINDOW_MS);
      expect(fresh).toEqual({ attempts: 1, windowStartedAt: 1000 + RATE_LIMIT_WINDOW_MS });
    });
  });

  describe('isRateLimited', () => {
    it('returns false when no bucket exists', () => {
      expect(isRateLimited(undefined)).toBe(false);
    });

    it('returns false at the maximum allowed attempts', () => {
      expect(isRateLimited({ attempts: RATE_LIMIT_MAX_ATTEMPTS, windowStartedAt: 0 })).toBe(false);
    });

    it('returns true beyond the maximum allowed attempts', () => {
      expect(isRateLimited({ attempts: RATE_LIMIT_MAX_ATTEMPTS + 1, windowStartedAt: 0 })).toBe(
        true,
      );
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
