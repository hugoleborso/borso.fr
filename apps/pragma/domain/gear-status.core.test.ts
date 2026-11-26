import { describe, expect, it } from 'vitest';
import {
  countGearByStatus,
  DEFAULT_GEAR_STATUS,
  isGearHoldingUpdateValid,
  isGearHoldingValid,
  keepHoldingOfPresentMember,
  selectGearHolderIds,
  nextGearHoldingAfterTap,
  selectGearCopySource,
} from './gear-status.core';

const BORSO = '11111111-1111-4111-8111-111111111111';
const TARGET = { id: 'target', date: new Date('2026-12-10T20:00:00Z') };

function concert(id: string, isoDate: string, gearItemCount: number) {
  return { id, date: new Date(isoDate), gearItemCount };
}

// @FollowsBlueprint test-pure-unit
describe('gear status', () => {
  it('starts an item at to find', () => {
    expect(DEFAULT_GEAR_STATUS).toBe('to_find');
  });

  it('holds a member only when the status is have', () => {
    expect(isGearHoldingValid({ status: 'have', memberId: BORSO })).toBe(true);
    expect(isGearHoldingValid({ status: 'to_find', memberId: null })).toBe(true);
    expect(isGearHoldingValid({ status: 'asked_of_venue', memberId: null })).toBe(true);
    expect(isGearHoldingValid({ status: 'have', memberId: null })).toBe(false);
    expect(isGearHoldingValid({ status: 'to_find', memberId: BORSO })).toBe(false);
    expect(isGearHoldingValid({ status: 'asked_of_venue', memberId: BORSO })).toBe(false);
  });

  it('takes a status and a member together on an update, or neither', () => {
    expect(isGearHoldingUpdateValid({})).toBe(true);
    expect(isGearHoldingUpdateValid({ status: 'have', memberId: BORSO })).toBe(true);
    expect(isGearHoldingUpdateValid({ status: 'to_find', memberId: null })).toBe(true);
    expect(isGearHoldingUpdateValid({ status: 'have' })).toBe(false);
    expect(isGearHoldingUpdateValid({ memberId: BORSO })).toBe(false);
    expect(isGearHoldingUpdateValid({ memberId: null })).toBe(false);
    expect(isGearHoldingUpdateValid({ status: 'asked_of_venue', memberId: BORSO })).toBe(false);
  });

  it('puts an item back to find when the member holding it is gone', () => {
    const present = new Set([BORSO]);
    const heldByBorso = { status: 'have', memberId: BORSO } as const;
    const venue = { status: 'asked_of_venue', memberId: null } as const;
    expect(keepHoldingOfPresentMember(heldByBorso, present)).toBe(heldByBorso);
    expect(keepHoldingOfPresentMember(venue, present)).toBe(venue);
    expect(keepHoldingOfPresentMember(heldByBorso, new Set())).toEqual({
      status: 'to_find',
      memberId: null,
    });
  });

  it('lists each member holding an item once', () => {
    expect(
      selectGearHolderIds([{ memberId: BORSO }, { memberId: null }, { memberId: BORSO }]),
    ).toEqual(new Set([BORSO]));
  });

  it('moves a tapped item from to find to the venue, to the tapper, then back to find', () => {
    expect(nextGearHoldingAfterTap('to_find', BORSO)).toEqual({
      status: 'asked_of_venue',
      memberId: null,
    });
    expect(nextGearHoldingAfterTap('asked_of_venue', BORSO)).toEqual({
      status: 'have',
      memberId: BORSO,
    });
    expect(nextGearHoldingAfterTap('have', BORSO)).toEqual({ status: 'to_find', memberId: null });
  });

  it('counts the items of each status, zero for a status nobody uses', () => {
    expect(
      countGearByStatus([{ status: 'to_find' }, { status: 'have' }, { status: 'to_find' }]),
    ).toEqual({ to_find: 2, asked_of_venue: 0, have: 1 });
    expect(countGearByStatus([])).toEqual({ to_find: 0, asked_of_venue: 0, have: 0 });
  });
});

describe('selectGearCopySource', () => {
  it('picks the latest concert dated before the target that holds items', () => {
    const older = concert('older', '2026-10-01T20:00:00Z', 4);
    const latest = concert('latest', '2026-11-20T20:00:00Z', 11);
    const emptier = concert('emptier', '2026-12-01T20:00:00Z', 0);
    const later = concert('later', '2026-12-20T20:00:00Z', 3);
    expect(selectGearCopySource([older, later, emptier, latest], TARGET)).toBe(latest);
  });

  it('never picks the target itself, nor a concert on the same instant', () => {
    const itself = { ...TARGET, gearItemCount: 5 };
    const sameInstant = concert('same', '2026-12-10T20:00:00Z', 2);
    expect(selectGearCopySource([itself, sameInstant], TARGET)).toBeNull();
  });

  it('breaks a tie on the date by id', () => {
    const second = concert('b', '2026-11-20T20:00:00Z', 1);
    const first = concert('a', '2026-11-20T20:00:00Z', 1);
    expect(selectGearCopySource([second, first], TARGET)).toBe(first);
    expect(selectGearCopySource([first, second], TARGET)).toBe(first);
  });

  it('answers nothing when no earlier concert holds items', () => {
    expect(selectGearCopySource([], TARGET)).toBeNull();
  });
});
