import { describe, expect, it } from 'vitest';
import {
  addDaysToIsoDay,
  formatDayWithYear,
  formatLongDay,
  formatMonth,
  formatShortDay,
  toIsoDay,
} from './calendar-day.utils';

const FRENCH = 'fr-FR';

describe('toIsoDay', () => {
  it('writes the local calendar day with zero padded month and day', () => {
    expect(toIsoDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toIsoDay(new Date(2026, 10, 25, 0, 1))).toBe('2026-11-25');
  });
});

describe('addDaysToIsoDay', () => {
  it('moves forward across a month boundary', () => {
    expect(addDaysToIsoDay('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('moves backward across a year boundary', () => {
    expect(addDaysToIsoDay('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('ignores a time part after the day', () => {
    expect(addDaysToIsoDay('2026-10-05T08:00:00Z', 2)).toBe('2026-10-07');
  });

  it('keeps the day when the shift is zero', () => {
    expect(addDaysToIsoDay('2026-03-29', 0)).toBe('2026-03-29');
  });
});

describe('the day formatters', () => {
  it('writes a short French day with weekday, day and month', () => {
    expect(formatShortDay('2026-10-05', FRENCH)).toBe('lun. 5 oct.');
  });

  it('writes a long French day', () => {
    expect(formatLongDay('2026-10-05', FRENCH)).toBe('lundi 5 octobre');
  });

  it('writes a month and its year', () => {
    expect(formatMonth('2017-01-31', FRENCH)).toBe('janv. 2017');
  });
});

describe('formatDayWithYear', () => {
  it('writes the day, the full month and the year, without the weekday', () => {
    expect(formatDayWithYear('2026-10-05', FRENCH)).toBe('5 octobre 2026');
  });
});
