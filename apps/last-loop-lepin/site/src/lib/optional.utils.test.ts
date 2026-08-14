import { describe, expect, it } from 'vitest';
import { listPresent, listWhen } from './optional.utils';

// @FollowsBlueprint test-pure-unit
describe('listPresent', () => {
  it('returns an empty list for null', () => {
    expect(listPresent(null)).toEqual([]);
  });

  it('returns an empty list for undefined', () => {
    expect(listPresent(undefined)).toEqual([]);
  });

  it('returns a one item list for a present value', () => {
    expect(listPresent(7)).toEqual([7]);
  });

  it('keeps a falsy but present value', () => {
    expect(listPresent(0)).toEqual([0]);
  });
});

describe('listWhen', () => {
  it('returns the value when the claim holds', () => {
    expect(listWhen(true, 'go')).toEqual(['go']);
  });

  it('returns nothing when the claim does not hold', () => {
    expect(listWhen(false, 'go')).toEqual([]);
  });
});
