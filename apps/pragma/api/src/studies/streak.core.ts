import { type CalendarDay, daysBetween, shiftCalendarDay } from './paris-day.core';

export const JOKER_WINDOW_DAYS = 7;

export interface Streak {
  readonly days: number;
  readonly isTodayCounted: boolean;
  readonly isJokerAvailable: boolean;
}

const PREVIOUS_DAY = -1;

function isJokerFreeAt(missedDay: CalendarDay, newerForgivenDay: CalendarDay | null): boolean {
  if (newerForgivenDay === null) return true;
  return daysBetween(newerForgivenDay, missedDay) >= JOKER_WINDOW_DAYS;
}

// @FollowsBlueprint core-decision
export function computeStreak(studiedDays: readonly CalendarDay[], today: CalendarDay): Streak {
  const studied = new Set(studiedDays);
  const isTodayCounted = studied.has(today);
  let cursor = isTodayCounted ? today : shiftCalendarDay(today, PREVIOUS_DAY);
  let days = 0;
  let newestForgivenDay: CalendarDay | null = null;
  let nearestForgivenDay: CalendarDay | null = null;
  for (;;) {
    if (studied.has(cursor)) {
      days += 1;
      cursor = shiftCalendarDay(cursor, PREVIOUS_DAY);
      continue;
    }
    const dayBefore = shiftCalendarDay(cursor, PREVIOUS_DAY);
    const isBridgeable = studied.has(dayBefore) && isJokerFreeAt(cursor, nearestForgivenDay);
    if (!isBridgeable) break;
    newestForgivenDay ??= cursor;
    nearestForgivenDay = cursor;
    cursor = dayBefore;
  }
  const isJokerAvailable =
    days === 0 ||
    newestForgivenDay === null ||
    daysBetween(today, newestForgivenDay) >= JOKER_WINDOW_DAYS;
  return { days, isTodayCounted, isJokerAvailable };
}
