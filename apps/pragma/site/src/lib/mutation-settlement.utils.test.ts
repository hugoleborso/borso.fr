import { describe, expect, it } from 'vitest';
import { isSettledByRefetch } from './mutation-settlement.utils';

// @FollowsBlueprint test-pure-unit
describe('isSettledByRefetch', () => {
  it('settles a mutation without an optimistic write by refetching', () => {
    expect(isSettledByRefetch({})).toBe(true);
  });

  it('leaves a mutation with an optimistic write to settle from its own response', () => {
    expect(isSettledByRefetch({ onMutate: () => undefined })).toBe(false);
  });
});
