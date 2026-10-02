import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  isKnownTimeZone,
  zonedWallTimeToInstant,
  parisCalendarDayOf,
  parisInstantAt,
  parisOffsetMinutes,
  parisWallTimeOf,
  parisWallTimeToInstant,
  weekdayOf,
} from './paris-time.core';

const WINTER_OFFSET_MINUTES = 60;
const SUMMER_OFFSET_MINUTES = 120;

describe('parisOffsetMinutes', () => {
  it('is one hour in winter and two in summer', () => {
    expect(parisOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(WINTER_OFFSET_MINUTES);
    expect(parisOffsetMinutes(new Date('2026-07-15T12:00:00Z'))).toBe(SUMMER_OFFSET_MINUTES);
  });

  it('ignores the seconds of the instant', () => {
    expect(parisOffsetMinutes(new Date('2026-07-15T12:00:42.500Z'))).toBe(SUMMER_OFFSET_MINUTES);
  });

  it('switches at 01:00 UTC on the last Sunday of October', () => {
    expect(parisOffsetMinutes(new Date('2026-10-25T00:59:00Z'))).toBe(SUMMER_OFFSET_MINUTES);
    expect(parisOffsetMinutes(new Date('2026-10-25T01:00:00Z'))).toBe(WINTER_OFFSET_MINUTES);
  });
});

describe('parisWallTimeOf', () => {
  it('reads the wall clock in Paris, midnight as hour zero', () => {
    expect(parisWallTimeOf(new Date('2026-10-13T22:00:00Z'))).toStrictEqual({
      year: 2026,
      month: 10,
      day: 14,
      hour: 0,
      minute: 0,
    });
  });
});

describe('parisWallTimeToInstant', () => {
  it('turns a summer evening into the right instant', () => {
    expect(
      parisWallTimeToInstant({
        year: 2026,
        month: 10,
        day: 14,
        hour: 19,
        minute: 15,
      }).toISOString(),
    ).toBe('2026-10-14T17:15:00.000Z');
  });

  it('turns a winter evening into the right instant', () => {
    expect(
      parisWallTimeToInstant({ year: 2026, month: 12, day: 1, hour: 18, minute: 0 }).toISOString(),
    ).toBe('2026-12-01T17:00:00.000Z');
  });

  it('lands on the right side of both clock changes', () => {
    expect(
      parisWallTimeToInstant({ year: 2026, month: 10, day: 25, hour: 18, minute: 0 }).toISOString(),
    ).toBe('2026-10-25T17:00:00.000Z');
    expect(
      parisWallTimeToInstant({ year: 2027, month: 3, day: 28, hour: 18, minute: 0 }).toISOString(),
    ).toBe('2027-03-28T16:00:00.000Z');
  });
});

describe('calendar days', () => {
  it('reads the Paris day of an instant', () => {
    expect(parisCalendarDayOf(new Date('2026-10-13T22:30:00Z'))).toStrictEqual({
      year: 2026,
      month: 10,
      day: 14,
    });
  });

  it('adds days across a month end', () => {
    expect(addCalendarDays({ year: 2026, month: 10, day: 30 }, 3)).toStrictEqual({
      year: 2026,
      month: 11,
      day: 2,
    });
  });

  it('names Sunday 0 and Saturday 6', () => {
    expect(weekdayOf({ year: 2026, month: 10, day: 18 })).toBe(0);
    expect(weekdayOf({ year: 2026, month: 10, day: 17 })).toBe(6);
  });

  it('builds an instant from a day and an hour, minute defaulting to zero', () => {
    expect(parisInstantAt({ year: 2026, month: 10, day: 14 }, 18).toISOString()).toBe(
      '2026-10-14T16:00:00.000Z',
    );
    expect(parisInstantAt({ year: 2026, month: 10, day: 14 }, 18, 30).toISOString()).toBe(
      '2026-10-14T16:30:00.000Z',
    );
  });
});

describe('other time zones', () => {
  it('turns a wall time in another IANA zone into the right instant', () => {
    expect(
      zonedWallTimeToInstant(
        { year: 2026, month: 10, day: 5, hour: 12, minute: 0 },
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-05T16:00:00.000Z');
  });

  it('knows the IANA zones and refuses a Windows zone name', () => {
    expect(isKnownTimeZone('America/New_York')).toBe(true);
    expect(isKnownTimeZone('America/New_York')).toBe(true);
    expect(isKnownTimeZone('Romance Standard Time')).toBe(false);
  });
});
