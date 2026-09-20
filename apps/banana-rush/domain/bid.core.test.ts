import { describe, expect, it } from 'vitest';
import { isBidAllowed, MAXIMUM_BID_BANANAS, MINIMUM_BID_BANANAS, refuseBid } from './bid.core';

// @FollowsBlueprint test-pure-unit
describe('refuseBid', () => {
  it('accepts the smallest legal bid', () => {
    expect(refuseBid(MINIMUM_BID_BANANAS)).toBeNull();
  });

  it('accepts the largest legal bid', () => {
    expect(refuseBid(MAXIMUM_BID_BANANAS)).toBeNull();
  });

  it('refuses a bid that is not a whole number', () => {
    expect(refuseBid(4.5)).toBe('not-a-whole-number');
  });

  it('refuses a bid below the minimum', () => {
    expect(refuseBid(MINIMUM_BID_BANANAS - 1)).toBe('below-minimum');
  });

  it('refuses a bid above the maximum', () => {
    expect(refuseBid(MAXIMUM_BID_BANANAS + 1)).toBe('above-maximum');
  });
});

describe('isBidAllowed', () => {
  it('is true for a legal bid', () => {
    expect(isBidAllowed(42)).toBe(true);
  });

  it('is false for an illegal bid', () => {
    expect(isBidAllowed(0)).toBe(false);
  });
});
