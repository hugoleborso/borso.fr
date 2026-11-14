import { describe, expect, it } from 'vitest';
import {
  countDaysBetween,
  deriveCalendarDay,
  isCalendarDay,
  shiftCalendarDay,
} from './calendar-day.core';

const PARIS_WINTER_OFFSET_MINUTES = 60;
const NEW_YORK_WINTER_OFFSET_MINUTES = -300;

// @FollowsBlueprint test-pure-unit
describe('deriveCalendarDay', () => {
  it('reads the day on the device, not in UTC', () => {
    const lateEvening = new Date('2026-01-01T23:30:00.000Z');
    expect(deriveCalendarDay(lateEvening, 0)).toBe('2026-01-01');
    expect(deriveCalendarDay(lateEvening, PARIS_WINTER_OFFSET_MINUTES)).toBe('2026-01-02');
  });

  it('stays on the previous day west of UTC', () => {
    const earlyMorning = new Date('2026-03-01T02:00:00.000Z');
    expect(deriveCalendarDay(earlyMorning, NEW_YORK_WINTER_OFFSET_MINUTES)).toBe('2026-02-28');
  });
});

describe('isCalendarDay', () => {
  it('accepts a real day', () => {
    expect(isCalendarDay('2026-02-28')).toBe(true);
    expect(isCalendarDay('2028-02-29')).toBe(true);
  });

  it('refuses another shape, a day that does not exist and a month that does not exist', () => {
    expect(isCalendarDay('2026-2-28')).toBe(false);
    expect(isCalendarDay('2026-02-30')).toBe(false);
    expect(isCalendarDay('2026-13-01')).toBe(false);
    expect(isCalendarDay('2026-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('shiftCalendarDay', () => {
  it('moves forward across a month and a year', () => {
    expect(shiftCalendarDay('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftCalendarDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('moves backward and stays put on zero', () => {
    expect(shiftCalendarDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftCalendarDay('2026-03-01', 0)).toBe('2026-03-01');
  });
});

describe('countDaysBetween', () => {
  it('counts forward, backward and zero', () => {
    expect(countDaysBetween('2026-01-01', '2026-01-04')).toBe(3);
    expect(countDaysBetween('2026-01-04', '2026-01-01')).toBe(-3);
    expect(countDaysBetween('2026-01-04', '2026-01-04')).toBe(0);
  });

  it('counts across a leap day', () => {
    expect(countDaysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});
