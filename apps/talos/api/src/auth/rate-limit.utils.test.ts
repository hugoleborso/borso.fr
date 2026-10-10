import { describe, expect, it } from 'vitest';
import { AUTHENTICATION_BUDGET, isRateLimited, windowFloorFor } from './rate-limit.utils';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('windowFloorFor', () => {
  it('is one window before now, so a bucket that started there has expired', () => {
    expect(windowFloorFor(new Date(NOW), AUTHENTICATION_BUDGET)).toEqual(
      new Date(NOW - FIFTEEN_MINUTES),
    );
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
