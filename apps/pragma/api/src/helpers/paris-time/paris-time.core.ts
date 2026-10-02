export const BAND_TIME_ZONE = 'Europe/Paris';

const MILLISECONDS_PER_MINUTE = 60_000;
const MONTH_INDEX_OFFSET = 1;
const MIDNIGHT_HOUR = 24;
const OFFSET_SETTLING_PASSES = 2;

export interface CalendarDay {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface WallTime extends CalendarDay {
  readonly hour: number;
  readonly minute: number;
}

const wallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BAND_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

function readPart(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return Number(parts.find((part) => part.type === type)?.value);
}

function wallTimeAsUtcMilliseconds(wallTime: WallTime): number {
  return Date.UTC(
    wallTime.year,
    wallTime.month - MONTH_INDEX_OFFSET,
    wallTime.day,
    wallTime.hour,
    wallTime.minute,
  );
}

// @FollowsBlueprint helper-module
export function parisWallTimeOf(instant: Date): WallTime {
  const parts = wallClockFormatter.formatToParts(instant);
  return {
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
    hour: readPart(parts, 'hour') % MIDNIGHT_HOUR,
    minute: readPart(parts, 'minute'),
  };
}

export function parisOffsetMinutes(instant: Date): number {
  const wallMilliseconds = wallTimeAsUtcMilliseconds(parisWallTimeOf(instant));
  const instantToTheMinute =
    Math.floor(instant.getTime() / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE;
  return (wallMilliseconds - instantToTheMinute) / MILLISECONDS_PER_MINUTE;
}

export function parisWallTimeToInstant(wallTime: WallTime): Date {
  const wallMilliseconds = wallTimeAsUtcMilliseconds(wallTime);
  let candidate = wallMilliseconds;
  for (let pass = 0; pass < OFFSET_SETTLING_PASSES; pass++) {
    const offsetMinutes = parisOffsetMinutes(new Date(candidate));
    candidate = wallMilliseconds - offsetMinutes * MILLISECONDS_PER_MINUTE;
  }
  return new Date(candidate);
}

export function parisCalendarDayOf(instant: Date): CalendarDay {
  const { year, month, day } = parisWallTimeOf(instant);
  return { year, month, day };
}

export function addCalendarDays(calendarDay: CalendarDay, days: number): CalendarDay {
  const shifted = new Date(
    Date.UTC(calendarDay.year, calendarDay.month - MONTH_INDEX_OFFSET, calendarDay.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + MONTH_INDEX_OFFSET,
    day: shifted.getUTCDate(),
  };
}

export function weekdayOf(calendarDay: CalendarDay): number {
  return new Date(
    Date.UTC(calendarDay.year, calendarDay.month - MONTH_INDEX_OFFSET, calendarDay.day),
  ).getUTCDay();
}

export function parisInstantAt(calendarDay: CalendarDay, hour: number, minute = 0): Date {
  return parisWallTimeToInstant({ ...calendarDay, hour, minute });
}
