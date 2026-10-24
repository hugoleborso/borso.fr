import { describe, expect, it } from 'vitest';
import { isReorderOfTheSameIds } from './reorder.core';

// @FollowsBlueprint test-pure-unit
describe('isReorderOfTheSameIds', () => {
  it('accepts the current ids in any order', () => {
    expect(isReorderOfTheSameIds(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
    expect(isReorderOfTheSameIds([], [])).toBe(true);
  });

  it('refuses a list missing an id or carrying one more', () => {
    expect(isReorderOfTheSameIds(['a', 'b'], ['a'])).toBe(false);
    expect(isReorderOfTheSameIds(['a'], ['a', 'b'])).toBe(false);
  });

  it('refuses an id that is not among the current ones', () => {
    expect(isReorderOfTheSameIds(['a', 'b'], ['a', 'z'])).toBe(false);
  });

  it('refuses an id named twice in place of another', () => {
    expect(isReorderOfTheSameIds(['a', 'b'], ['a', 'a'])).toBe(false);
    expect(isReorderOfTheSameIds(['a', 'b'], ['a', 'b', 'a'])).toBe(false);
  });
});
