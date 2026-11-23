import { describe, expect, it } from 'vitest';
import { type CalendarDay, shiftCalendarDay } from './paris-day.core';
import {
  computeBandFlame,
  computePersonalFlame,
  type FlameDayState,
  type FlameWeekDay,
} from './practice-flame.core';

const THURSDAY = '2026-10-29';
const WEDNESDAY = '2026-10-28';

function runOfDays(newestDay: CalendarDay, length: number): CalendarDay[] {
  return Array.from({ length }, (_, offset) => shiftCalendarDay(newestDay, -offset));
}

const NO_SESSION = new Set<CalendarDay>();

function flameSummary(presenceDays: ReadonlySet<CalendarDay>, today: CalendarDay) {
  const { days, isTodayCounted, jokersLeftThisWeek } = computePersonalFlame(
    presenceDays,
    NO_SESSION,
    today,
  );
  return { days, isTodayCounted, jokersLeftThisWeek };
}

function weekStates(week: readonly FlameWeekDay[]): [CalendarDay, FlameDayState, boolean][] {
  return week.map((weekDay) => [weekDay.day, weekDay.state, weekDay.isSessionDay]);
}

function activeOn(...days: readonly (CalendarDay | readonly CalendarDay[])[]): Set<CalendarDay> {
  return new Set(days.flat());
}

// @FollowsBlueprint test-pure-unit
describe('computePersonalFlame', () => {
  it('counts consecutive active days and marks today counted', () => {
    expect(flameSummary(activeOn(runOfDays(THURSDAY, 5)), THURSDAY)).toEqual({
      days: 5,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
  });

  it('keeps a run ending yesterday alive while today is still open', () => {
    expect(flameSummary(activeOn(runOfDays(WEDNESDAY, 5)), THURSDAY)).toEqual({
      days: 5,
      isTodayCounted: false,
      jokersLeftThisWeek: 3,
    });
  });

  it('bridges a gap that ends yesterday while today is open (Q-A)', () => {
    expect(flameSummary(activeOn(runOfDays('2026-10-27', 12)), THURSDAY)).toEqual({
      days: 12,
      isTodayCounted: false,
      jokersLeftThisWeek: 2,
    });
  });

  it('spends one joker per missed day and adds nothing for a bridged day', () => {
    expect(flameSummary(activeOn(THURSDAY, '2026-10-27', '2026-10-25'), THURSDAY)).toEqual({
      days: 3,
      isTodayCounted: true,
      jokersLeftThisWeek: 1,
    });
  });

  it('bridges a gap that crosses a Monday with each week’s own jokers', () => {
    expect(flameSummary(activeOn(WEDNESDAY, '2026-10-22'), WEDNESDAY)).toEqual({
      days: 2,
      isTodayCounted: true,
      jokersLeftThisWeek: 1,
    });
  });

  it('ends the flame on a fourth missed day in one week', () => {
    const sunday = '2026-10-25';
    expect(flameSummary(activeOn(sunday, '2026-10-20'), sunday)).toEqual({
      days: 1,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
    expect(flameSummary(activeOn(sunday, '2026-10-21', '2026-10-20'), sunday)).toEqual({
      days: 3,
      isTodayCounted: true,
      jokersLeftThisWeek: 0,
    });
  });

  it('spends no joker on missed days older than the first active day', () => {
    expect(flameSummary(activeOn(THURSDAY, WEDNESDAY), THURSDAY)).toEqual({
      days: 2,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
  });

  it('spends no joker on a gap it cannot bridge whole', () => {
    const wednesday = '2026-10-21';
    expect(flameSummary(activeOn(wednesday, '2026-10-20', '2026-10-14'), wednesday)).toEqual({
      days: 2,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
  });

  it('counts jokers left this week from the jokers spent since Monday', () => {
    const lastWeekWithThreeMisses = ['2026-10-26', '2026-10-23', '2026-10-21'];
    expect(flameSummary(activeOn('2026-10-27', lastWeekWithThreeMisses), '2026-10-27')).toEqual({
      days: 4,
      isTodayCounted: true,
      jokersLeftThisWeek: 3,
    });
    expect(flameSummary(activeOn(WEDNESDAY, lastWeekWithThreeMisses), WEDNESDAY)).toEqual({
      days: 4,
      isTodayCounted: true,
      jokersLeftThisWeek: 2,
    });
  });

  it('keeps the flame of a member who stopped on Thursday until the second Friday', () => {
    const studiedUntilThursday = activeOn(runOfDays('2026-10-15', 15));
    expect(flameSummary(studiedUntilThursday, '2026-10-22')).toEqual({
      days: 15,
      isTodayCounted: false,
      jokersLeftThisWeek: 0,
    });
    expect(flameSummary(studiedUntilThursday, '2026-10-23')).toEqual({
      days: 0,
      isTodayCounted: false,
      jokersLeftThisWeek: 3,
    });
  });

  it('returns 0 days and 3 jokers for a member with no activity', () => {
    expect(flameSummary(new Set(), THURSDAY)).toEqual({
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

describe('computePersonalFlame, week', () => {
  it('marks each day of today’s week active, joker, open or future, and the session days', () => {
    const saturday = '2026-10-31';
    const flame = computePersonalFlame(
      activeOn('2026-10-27', THURSDAY, '2026-10-30'),
      new Set(['2026-10-26']),
      saturday,
    );
    expect(weekStates(flame.week)).toEqual([
      ['2026-10-26', 'active', true],
      ['2026-10-27', 'active', false],
      [WEDNESDAY, 'joker', false],
      [THURSDAY, 'active', false],
      ['2026-10-30', 'active', false],
      [saturday, 'open', false],
      ['2026-11-01', 'future', false],
    ]);
    expect(flame.jokersLeftThisWeek).toBe(2);
  });

  it('marks the days before a flame that started on Wednesday missed, and today active', () => {
    const flame = computePersonalFlame(activeOn(WEDNESDAY, THURSDAY), NO_SESSION, THURSDAY);
    expect(weekStates(flame.week)).toEqual([
      ['2026-10-26', 'missed', false],
      ['2026-10-27', 'missed', false],
      [WEDNESDAY, 'active', false],
      [THURSDAY, 'active', false],
      ['2026-10-30', 'future', false],
      ['2026-10-31', 'future', false],
      ['2026-11-01', 'future', false],
    ]);
  });

  it('shows only this week’s days of a bridged gap that crosses the Monday', () => {
    const flame = computePersonalFlame(activeOn(WEDNESDAY, '2026-10-22'), NO_SESSION, WEDNESDAY);
    expect(weekStates(flame.week).slice(0, 3)).toEqual([
      ['2026-10-26', 'joker', false],
      ['2026-10-27', 'joker', false],
      [WEDNESDAY, 'active', false],
    ]);
    expect(flame.week.filter((weekDay) => weekDay.state === 'joker')).toHaveLength(
      3 - flame.jokersLeftThisWeek,
    );
  });

  it('leaves the days of a gap it could not bridge missed', () => {
    const sunday = '2026-11-01';
    const flame = computePersonalFlame(activeOn('2026-10-26'), NO_SESSION, sunday);
    expect(flame.days).toBe(0);
    expect(flame.week.map((weekDay) => weekDay.state)).toEqual([
      'active',
      'missed',
      'missed',
      'missed',
      'missed',
      'missed',
      'open',
    ]);
  });
});
