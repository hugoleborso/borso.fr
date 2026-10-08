import { describe, expect, it } from 'vitest';
import {
  addDaysToDate,
  countDaysBetween,
  formatParisDate,
  formatParisMinute,
} from './paris-clock.utils';

const SUMMER_EVENING_UTC = new Date('2026-10-05T22:30:05Z');
const WINTER_MORNING_UTC = new Date('2026-12-01T07:04:09Z');

describe('formatParisDate', () => {
  it('reads the calendar day in Paris, which is already tomorrow late in the UTC evening', () => {
    expect(formatParisDate(SUMMER_EVENING_UTC)).toBe('2026-10-06');
  });
});

describe('formatParisMinute', () => {
  it('writes the Paris wall clock to the minute, an hour ahead of UTC in winter', () => {
    expect(formatParisMinute(WINTER_MORNING_UTC)).toBe('2026-12-01 08:04');
  });

  it('writes the Paris wall clock two hours ahead of UTC in summer', () => {
    expect(formatParisMinute(SUMMER_EVENING_UTC)).toBe('2026-10-06 00:30');
  });
});

describe('addDaysToDate', () => {
  it('moves a date forward across a month end', () => {
    expect(addDaysToDate('2026-10-30', 2)).toBe('2026-11-01');
  });

  it('moves a date backward', () => {
    expect(addDaysToDate('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('countDaysBetween', () => {
  it('counts the calendar days from one date to a later one, across a month end', () => {
    expect(countDaysBetween('2026-09-29', '2026-10-02')).toBe(3);
  });

  it('counts whole days across the change to winter time', () => {
    expect(countDaysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('answers a negative count when the second date comes first', () => {
    expect(countDaysBetween('2026-10-08', '2026-10-07')).toBe(-1);
  });
});
