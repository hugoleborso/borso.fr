import { describe, expect, it } from 'vitest';
import {
  hashClientAddress,
  isRateLimited,
  SIGN_IN_MAX_ATTEMPTS,
  SIGN_IN_WINDOW_MS,
  selectWindowFloor,
} from './rate-limit.utils';

// @FollowsBlueprint test-pure-unit
describe('hashClientAddress', () => {
  it('stores a SHA-256 digest rather than the address', () => {
    expect(hashClientAddress('203.0.113.7')).toBe(
      'fec52565aa0cf18f57d7cf5b3ac728503b8992d2d6f7d46da1d1201090902b02',
    );
  });
});

describe('selectWindowFloor', () => {
  it('starts the window fifteen minutes before now', () => {
    expect(SIGN_IN_WINDOW_MS).toBe(900_000);
    expect(selectWindowFloor(new Date('2026-11-13T10:15:00.000Z'))).toEqual(
      new Date('2026-11-13T10:00:00.000Z'),
    );
  });
});

describe('isRateLimited', () => {
  it('lets the fifth attempt through and limits the sixth', () => {
    expect(SIGN_IN_MAX_ATTEMPTS).toBe(5);
    expect(isRateLimited(5)).toBe(false);
    expect(isRateLimited(6)).toBe(true);
  });
});
