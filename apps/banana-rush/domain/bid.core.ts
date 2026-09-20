export const MINIMUM_BID_BANANAS = 1;
export const MAXIMUM_BID_BANANAS = 999;

export type BidRefusal = 'not-a-whole-number' | 'below-minimum' | 'above-maximum';

// @FollowsBlueprint domain-shared-selection
export function refuseBid(amount: number): BidRefusal | null {
  if (!Number.isInteger(amount)) return 'not-a-whole-number';
  if (amount < MINIMUM_BID_BANANAS) return 'below-minimum';
  if (amount > MAXIMUM_BID_BANANAS) return 'above-maximum';
  return null;
}

export function isBidAllowed(amount: number): boolean {
  return refuseBid(amount) === null;
}
