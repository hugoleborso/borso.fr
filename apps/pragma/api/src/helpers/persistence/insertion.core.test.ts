import { describe, expect, it } from 'vitest';
import { selectInsertionOutcome } from './insertion.core';

// @FollowsBlueprint test-pure-unit
describe('selectInsertionOutcome', () => {
  it('reads a returned row as an insertion that happened', () => {
    expect(selectInsertionOutcome(1)).toBe('inserted');
  });

  it('reads no returned row as a row that was already there', () => {
    expect(selectInsertionOutcome(0)).toBe('already-present');
  });
});
