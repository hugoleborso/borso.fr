import {
  addCalendarDays,
  type CalendarDay,
  parisCalendarDayOf,
  parisInstantAt,
  weekdayOf,
} from '../helpers/paris-time/paris-time.core';
import type { TimeInterval } from './free-slots.types';

export const SEARCH_DAYS = 28;
export const PRACTICE_DURATION_MINUTES = 120;

const WEEKDAY_WINDOW_START_HOUR = 18;
const WEEKEND_WINDOW_START_HOUR = 10;
const SUNDAY = 0;
const SATURDAY = 6;
const NEXT_DAY = 1;
const MIDNIGHT_HOUR = 0;
const MILLISECONDS_PER_MINUTE = 60_000;
const QUARTER_HOUR_MINUTES = 15;
const QUARTER_HOUR_MILLISECONDS = QUARTER_HOUR_MINUTES * MILLISECONDS_PER_MINUTE;

function windowStartHourOf(calendarDay: CalendarDay): number {
  const weekday = weekdayOf(calendarDay);
  return weekday === SATURDAY || weekday === SUNDAY
    ? WEEKEND_WINDOW_START_HOUR
    : WEEKDAY_WINDOW_START_HOUR;
}

// @FollowsBlueprint core-decision
export function buildSearchWindows(now: Date, days: number): TimeInterval[] {
  const today = parisCalendarDayOf(now);
  const windows: TimeInterval[] = [];
  for (let offset = 0; offset < days; offset++) {
    const calendarDay = addCalendarDays(today, offset);
    const start = parisInstantAt(calendarDay, windowStartHourOf(calendarDay));
    const end = parisInstantAt(addCalendarDays(calendarDay, NEXT_DAY), MIDNIGHT_HOUR);
    windows.push({ start: new Date(Math.max(start.getTime(), now.getTime())), end });
  }
  return windows;
}

function byStart(left: TimeInterval, right: TimeInterval): number {
  return left.start.getTime() - right.start.getTime();
}

function subtractFromWindow(window: TimeInterval, busy: readonly TimeInterval[]): TimeInterval[] {
  const free: TimeInterval[] = [];
  let cursor = window.start;
  for (const interval of busy) {
    // Stryker disable next-line EqualityOperator: equivalent mutants. A busy interval ending exactly at the cursor, or starting exactly at the window end, covers no time, so skipping it or carving it leaves the same free intervals.
    if (interval.end <= cursor || interval.start >= window.end) continue;
    if (interval.start > cursor) free.push({ start: cursor, end: interval.start });
    cursor = interval.end;
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

export function subtractBusyIntervals(
  windows: readonly TimeInterval[],
  busy: readonly TimeInterval[],
): TimeInterval[] {
  const sortedBusy = [...busy].sort(byStart);
  return windows.flatMap((window) => subtractFromWindow(window, sortedBusy));
}

export function roundUpToQuarterHour(instant: Date): Date {
  return new Date(
    Math.ceil(instant.getTime() / QUARTER_HOUR_MILLISECONDS) * QUARTER_HOUR_MILLISECONDS,
  );
}

function isAtLeast(interval: TimeInterval, minutes: number): boolean {
  return interval.end.getTime() - interval.start.getTime() >= minutes * MILLISECONDS_PER_MINUTE;
}

export function selectFreeSlots(now: Date, busy: readonly TimeInterval[]): TimeInterval[] {
  return subtractBusyIntervals(buildSearchWindows(now, SEARCH_DAYS), busy)
    .map((interval) => ({ start: roundUpToQuarterHour(interval.start), end: interval.end }))
    .filter((interval) => isAtLeast(interval, PRACTICE_DURATION_MINUTES));
}
