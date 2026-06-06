import { describe, expect, it } from 'vitest';
import { isLastPendingMutation, LAST_PENDING_MUTATION_COUNT } from './optimistic.utils';

describe('isLastPendingMutation', () => {
  it('treats the lone settling mutation as the last one', () => {
    expect(isLastPendingMutation(LAST_PENDING_MUTATION_COUNT)).toBe(true);
  });

  it('treats a drained family (zero pending) as the last one', () => {
    expect(isLastPendingMutation(0)).toBe(true);
  });

  it('holds back invalidation while siblings are still pending', () => {
    expect(isLastPendingMutation(2)).toBe(false);
    expect(isLastPendingMutation(5)).toBe(false);
  });
});
