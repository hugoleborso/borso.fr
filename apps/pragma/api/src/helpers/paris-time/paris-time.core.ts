export const BAND_TIME_ZONE = 'Europe/Paris';

const MILLISECONDS_PER_MINUTE = 60_000;
const MONTH_INDEX_OFFSET = 1;
const MIDNIGHT_HOUR = 24;

export interface CalendarDay {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface WallTime extends CalendarDay {
  readonly hour: number;
  readonly minute: number;
}

const formatterByZone = new Map<string, Intl.DateTimeFormat>();

function wallClockFormatterOf(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterByZone.get(timeZone);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  formatterByZone.set(timeZone, formatter);
  return formatter;
}

export function isKnownTimeZone(timeZone: string): boolean {
  try {
    wallClockFormatterOf(timeZone);
    return true;
  } catch {
    return false;
  }
}

function readParts(parts: readonly Intl.DateTimeFormatPart[]): Map<string, string> {
  return new Map(parts.map((part) => [part.type, part.value]));
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
export function zonedWallTimeOf(instant: Date, timeZone: string): WallTime {
  const parts = readParts(wallClockFormatterOf(timeZone).formatToParts(instant));
  return {
    year: Number(parts.get('year')),
    month: Number(parts.get('month')),
    day: Number(parts.get('day')),
    hour: Number(parts.get('hour')) % MIDNIGHT_HOUR,
    minute: Number(parts.get('minute')),
  };
}

export function parisWallTimeOf(instant: Date): WallTime {
  return zonedWallTimeOf(instant, BAND_TIME_ZONE);
}

export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const wallMilliseconds = wallTimeAsUtcMilliseconds(zonedWallTimeOf(instant, timeZone));
  const instantToTheMinute =
    Math.floor(instant.getTime() / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE;
  return (wallMilliseconds - instantToTheMinute) / MILLISECONDS_PER_MINUTE;
}

export function parisOffsetMinutes(instant: Date): number {
  return zoneOffsetMinutes(instant, BAND_TIME_ZONE);
}

export function zonedWallTimeToInstant(wallTime: WallTime, timeZone: string): Date {
  const wallMilliseconds = wallTimeAsUtcMilliseconds(wallTime);
  const shiftedBy = (instantMilliseconds: number): number =>
    wallMilliseconds -
    zoneOffsetMinutes(new Date(instantMilliseconds), timeZone) * MILLISECONDS_PER_MINUTE;
  return new Date(shiftedBy(shiftedBy(wallMilliseconds)));
}

export function parisWallTimeToInstant(wallTime: WallTime): Date {
  return zonedWallTimeToInstant(wallTime, BAND_TIME_ZONE);
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
