import { describe, expect, it } from 'vitest';
import { computeSharePercent, isCapacityKnown, parseFriendsCounts } from './friends-count.core';

const MEMBER_ID = '00000000-0000-4000-8000-000000000000';

describe('parseFriendsCounts', () => {
  it('keeps a well-formed record', () => {
    expect(parseFriendsCounts({ [MEMBER_ID]: 3 })).toEqual({ [MEMBER_ID]: 3 });
  });

  it('reads an unparsable value as empty', () => {
    expect(parseFriendsCounts('nope')).toEqual({});
    expect(parseFriendsCounts({ [MEMBER_ID]: 'three' })).toEqual({});
  });
});

describe('computeSharePercent', () => {
  it('reads a part of a whole as a percentage', () => {
    expect(computeSharePercent(3, 12)).toBe(25);
    expect(computeSharePercent(12, 12)).toBe(100);
  });

  it('reads any share of nothing as nothing, rather than as NaN', () => {
    expect(computeSharePercent(0, 0)).toBe(0);
    expect(computeSharePercent(4, 0)).toBe(0);
  });

  it('lets a share run past the whole, because a venue can be oversold', () => {
    expect(computeSharePercent(15, 10)).toBe(150);
  });
});

describe('isCapacityKnown', () => {
  it('accepts a capacity somebody filled in', () => {
    expect(isCapacityKnown(120)).toBe(true);
  });

  it('rejects an unset capacity and the zero that stands for one', () => {
    expect(isCapacityKnown(null)).toBe(false);
    expect(isCapacityKnown(0)).toBe(false);
  });
});
