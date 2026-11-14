export type CalendarDay = string;

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * MILLISECONDS_PER_MINUTE;
const CALENDAR_DAY_LENGTH = 10;

function formatUtcDay(instantMilliseconds: number): CalendarDay {
  return new Date(instantMilliseconds).toISOString().slice(0, CALENDAR_DAY_LENGTH);
}

function readUtcMidnight(day: CalendarDay): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

// @FollowsBlueprint domain-shared-selection
export function deriveCalendarDay(instant: Date, utcOffsetMinutes: number): CalendarDay {
  return formatUtcDay(instant.getTime() + utcOffsetMinutes * MILLISECONDS_PER_MINUTE);
}

export function isCalendarDay(value: string): boolean {
  const midnight = readUtcMidnight(value);
  return !Number.isNaN(midnight) && formatUtcDay(midnight) === value;
}

export function shiftCalendarDay(day: CalendarDay, days: number): CalendarDay {
  return formatUtcDay(readUtcMidnight(day) + days * MILLISECONDS_PER_DAY);
}

export function countDaysBetween(firstDay: CalendarDay, lastDay: CalendarDay): number {
  return Math.round((readUtcMidnight(lastDay) - readUtcMidnight(firstDay)) / MILLISECONDS_PER_DAY);
}
