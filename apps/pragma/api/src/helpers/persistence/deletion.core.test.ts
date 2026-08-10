import { describe, expect, it } from 'vitest';
import { selectDeletionOutcome } from './deletion.core';

// @FollowsBlueprint test-pure-unit
describe('selectDeletionOutcome', () => {
  it('reports a deletion when at least one row was removed', () => {
    expect(selectDeletionOutcome(1)).toBe('deleted');
  });

  it('reports not-found when no row matched', () => {
    expect(selectDeletionOutcome(0)).toBe('not-found');
  });
});
