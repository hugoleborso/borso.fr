import { describe, expect, it } from 'vitest';
import {
  computeSharePercent,
  isCapacityKnown,
  parseFriendsCounts,
  tallyFriends,
} from './friends-count.core';

const MEMBER_ID = '00000000-0000-4000-8000-000000000000';
const OTHER_MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const DEPARTED_MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER = { id: MEMBER_ID };
const OTHER_MEMBER = { id: OTHER_MEMBER_ID };

function comingFor(memberId: string | null, times: number) {
  return Array.from({ length: times }, () => ({
    comingFor: memberId === null ? null : { id: memberId },
  }));
}

// @FollowsBlueprint test-pure-unit
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

describe('tallyFriends', () => {
  it('draws every row on one scale, the largest of all registrations and expected counts', () => {
    const tally = tallyFriends({
      members: [MEMBER, OTHER_MEMBER],
      expectedCounts: { [MEMBER_ID]: 8, [OTHER_MEMBER_ID]: 2 },
      registrations: [...comingFor(MEMBER_ID, 6), ...comingFor(OTHER_MEMBER_ID, 4)],
    });
    expect(tally.rows).toEqual([
      {
        member: MEMBER,
        registered: 6,
        expected: 8,
        registeredPercent: 75,
        expectedPercent: 100,
        isExpectedShown: true,
      },
      {
        member: OTHER_MEMBER,
        registered: 4,
        expected: 2,
        registeredPercent: 50,
        expectedPercent: 25,
        isExpectedShown: true,
      },
    ]);
    expect(tally.registeredTotal).toBe(10);
    expect(tally.expectedTotal).toBe(10);
    expect(tally.noPreferenceCount).toBe(0);
    expect(tally.noPreferencePercent).toBe(0);
  });

  it('lets a member past the expected count set the scale', () => {
    const tally = tallyFriends({
      members: [MEMBER],
      expectedCounts: { [MEMBER_ID]: 2 },
      registrations: comingFor(MEMBER_ID, 4),
    });
    expect(tally.rows[0]).toMatchObject({ registeredPercent: 100, expectedPercent: 50 });
  });

  it('lets the registrations that chose nobody set the scale too', () => {
    const tally = tallyFriends({
      members: [MEMBER],
      expectedCounts: { [MEMBER_ID]: 2 },
      registrations: [...comingFor(MEMBER_ID, 1), ...comingFor(null, 4)],
    });
    expect(tally.rows[0]).toMatchObject({ registeredPercent: 25, expectedPercent: 50 });
    expect(tally.noPreferenceCount).toBe(4);
    expect(tally.noPreferencePercent).toBe(100);
  });

  it('leaves every bar empty when nobody is expected and nobody registered', () => {
    const tally = tallyFriends({ members: [MEMBER], expectedCounts: {}, registrations: [] });
    expect(tally.rows).toEqual([
      {
        member: MEMBER,
        registered: 0,
        expected: 0,
        registeredPercent: 0,
        expectedPercent: 0,
        isExpectedShown: false,
      },
    ]);
    expect(tally.expectedTotal).toBe(0);
    expect(tally.noPreferencePercent).toBe(0);
  });

  it('puts a registration for a member no longer listed under no preference', () => {
    const tally = tallyFriends({
      members: [MEMBER],
      expectedCounts: { [MEMBER_ID]: 3, [DEPARTED_MEMBER_ID]: 2 },
      registrations: [
        ...comingFor(MEMBER_ID, 1),
        ...comingFor(null, 1),
        ...comingFor(DEPARTED_MEMBER_ID, 1),
      ],
    });
    expect(tally.noPreferenceCount).toBe(2);
    expect(tally.registeredTotal).toBe(3);
    expect(tally.expectedTotal).toBe(5);
  });
});
