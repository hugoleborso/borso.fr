import { describe, expect, it } from 'vitest';
import { type CalendarDay, shiftCalendarDay } from './paris-day.core';
import { computeBandFlame, computePersonalFlame } from './practice-flame.core';

const THURSDAY = '2026-10-29';
const WEDNESDAY = '2026-10-28';

function runOfDays(newestDay: CalendarDay, length: number): CalendarDay[] {
  return Array.from({ length }, (_, offset) => shiftCalendarDay(newestDay, -offset));
}

function activeOn(...days: readonly (CalendarDay | readonly CalendarDay[])[]): Set<CalendarDay> {
  return new Set(days.flat());
}

// @FollowsBlueprint test-pure-unit
describe('computePersonalFlame', () => {
  it('counts consecutive active days and marks today counted', () => {
    expect(computePersonalFlame(activeOn(runOfDays(THURSDAY, 5)), THURSDAY)).toEqual({
      days: 5,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
  });

  it('keeps a run ending yesterday alive while today is still open', () => {
    expect(computePersonalFlame(activeOn(runOfDays(WEDNESDAY, 5)), THURSDAY)).toEqual({
      days: 5,
      isTodayCounted: false,
      jokersLeftThisWeek: 3,
    });
  });

  it('bridges a gap that ends yesterday while today is open (Q-A)', () => {
    expect(computePersonalFlame(activeOn(runOfDays('2026-10-27', 12)), THURSDAY)).toEqual({
      days: 12,
      isTodayCounted: false,
      jokersLeftThisWeek: 2,
    });
  });

  it('spends one joker per missed day and adds nothing for a bridged day', () => {
    expect(computePersonalFlame(activeOn(THURSDAY, '2026-10-27', '2026-10-25'), THURSDAY)).toEqual({
      days: 3,
      isTodayCounted: true,
      jokersLeftThisWeek: 1,
    });
  });

  it('bridges a gap that crosses a Monday with each week’s own jokers', () => {
    expect(computePersonalFlame(activeOn(WEDNESDAY, '2026-10-22'), WEDNESDAY)).toEqual({
      days: 2,
      isTodayCounted: true,
      jokersLeftThisWeek: 1,
    });
  });

  it('ends the flame on a fourth missed day in one week', () => {
    const sunday = '2026-10-25';
    expect(computePersonalFlame(activeOn(sunday, '2026-10-20'), sunday)).toEqual({
      days: 1,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
    expect(computePersonalFlame(activeOn(sunday, '2026-10-21', '2026-10-20'), sunday)).toEqual({
      days: 3,
      isTodayCounted: true,
      jokersLeftThisWeek: 0,
    });
  });

  it('spends no joker on missed days older than the first active day', () => {
    expect(computePersonalFlame(activeOn(THURSDAY, WEDNESDAY), THURSDAY)).toEqual({
      days: 2,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
  });

  it('spends no joker on a gap it cannot bridge whole', () => {
    const wednesday = '2026-10-21';
    expect(
      computePersonalFlame(activeOn(wednesday, '2026-10-20', '2026-10-14'), wednesday),
    ).toEqual({ days: 2, isTodayCounted: true, jokersLeftThisWeek: 3 });
  });

  it('counts jokers left this week from the jokers spent since Monday', () => {
    const lastWeekWithThreeMisses = ['2026-10-26', '2026-10-23', '2026-10-21'];
    expect(
      computePersonalFlame(activeOn('2026-10-27', lastWeekWithThreeMisses), '2026-10-27'),
    ).toEqual({ days: 4, isTodayCounted: true, jokersLeftThisWeek: 3 });
    expect(computePersonalFlame(activeOn(WEDNESDAY, lastWeekWithThreeMisses), WEDNESDAY)).toEqual({
      days: 4,
      isTodayCounted: true,
      jokersLeftThisWeek: 2,
    });
  });

  it('keeps the flame of a member who stopped on Thursday until the second Friday', () => {
    const studiedUntilThursday = activeOn(runOfDays('2026-10-15', 15));
    expect(computePersonalFlame(studiedUntilThursday, '2026-10-22')).toEqual({
      days: 15,
      isTodayCounted: false,
      jokersLeftThisWeek: 0,
    });
    expect(computePersonalFlame(studiedUntilThursday, '2026-10-23')).toEqual({
      days: 0,
      isTodayCounted: false,
      jokersLeftThisWeek: 3,
    });
  });

  it('returns 0 days and 3 jokers for a member with no activity', () => {
    expect(computePersonalFlame(new Set(), THURSDAY)).toEqual({
      days: 0,
      isTodayCounted: false,
      jokersLeftThisWeek: 3,
    });
  });
});

describe('computeBandFlame', () => {
  it('ends the band flame on its first missed day, with no joker', () => {
    expect(computeBandFlame(activeOn(THURSDAY, '2026-10-27', '2026-10-26'), THURSDAY)).toEqual({
      days: 1,
      isTodayCounted: true,
    });
  });

  it('keeps the band flame alive while today is still open', () => {
    expect(computeBandFlame(activeOn(runOfDays(WEDNESDAY, 2)), THURSDAY)).toEqual({
      days: 2,
      isTodayCounted: false,
    });
  });
});
