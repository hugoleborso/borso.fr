export type CalendarDay = string;

export const PARIS_TIME_ZONE = 'Europe/Paris';

const MILLISECONDS_PER_DAY = 86_400_000;
const CALENDAR_DAY_LOCALE = 'en-CA';
const ISO_DAY_LENGTH = 'YYYY-MM-DD'.length;
const MONDAY_INDEX = 1;
const DAYS_PER_WEEK = 7;

const parisDayFormat = new Intl.DateTimeFormat(CALENDAR_DAY_LOCALE, {
  timeZone: PARIS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function epochOfDay(day: CalendarDay): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function dayOfEpoch(epochMs: number): CalendarDay {
  return new Date(epochMs).toISOString().slice(0, ISO_DAY_LENGTH);
}

// @FollowsBlueprint core-projection
export function parisCalendarDay(instant: Date): CalendarDay {
  return parisDayFormat.format(instant);
}

export function shiftCalendarDay(day: CalendarDay, offsetDays: number): CalendarDay {
  return dayOfEpoch(epochOfDay(day) + offsetDays * MILLISECONDS_PER_DAY);
}

export function daysBetween(later: CalendarDay, earlier: CalendarDay): number {
  return Math.round((epochOfDay(later) - epochOfDay(earlier)) / MILLISECONDS_PER_DAY);
}

export function mondayOfWeek(day: CalendarDay): CalendarDay {
  const weekday = new Date(epochOfDay(day)).getUTCDay();
  const daysSinceMonday = (weekday - MONDAY_INDEX + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return shiftCalendarDay(day, -daysSinceMonday);
}
