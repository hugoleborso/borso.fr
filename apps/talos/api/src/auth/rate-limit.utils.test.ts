import { describe, expect, it } from 'vitest';
import { AUTHENTICATION_BUDGET, isRateLimited, recordAttempt } from './rate-limit.utils';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('recordAttempt', () => {
  it('opens a window on the first attempt', () => {
    expect(recordAttempt(null, NOW, AUTHENTICATION_BUDGET)).toEqual({
      attempts: 1,
      windowStartedAt: NOW,
    });
  });

  it('counts an attempt inside the open window', () => {
    const bucket = { attempts: 3, windowStartedAt: NOW };
    expect(recordAttempt(bucket, NOW + FIFTEEN_MINUTES - 1, AUTHENTICATION_BUDGET)).toEqual({
      attempts: 4,
      windowStartedAt: NOW,
    });
  });

  it('opens a new window once fifteen minutes have passed', () => {
    const bucket = { attempts: 30, windowStartedAt: NOW };
    expect(recordAttempt(bucket, NOW + FIFTEEN_MINUTES, AUTHENTICATION_BUDGET)).toEqual({
      attempts: 1,
      windowStartedAt: NOW + FIFTEEN_MINUTES,
    });
  });
});

describe('isRateLimited', () => {
  it('lets the tenth attempt through and stops the eleventh', () => {
    expect(isRateLimited({ attempts: 10, windowStartedAt: NOW }, AUTHENTICATION_BUDGET)).toBe(
      false,
    );
    expect(isRateLimited({ attempts: 11, windowStartedAt: NOW }, AUTHENTICATION_BUDGET)).toBe(true);
  });
});
