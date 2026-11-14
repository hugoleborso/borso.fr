import { type CalendarDay, shiftCalendarDay } from '@domain/calendar-day.core';
import type { ReviewEvent } from '@domain/review-event.core';

// @FollowsBlueprint core-projection
export function countStreakDays(events: readonly ReviewEvent[], today: CalendarDay): number {
  const reviewedDays = new Set(events.map((event) => event.calendarDay));
  const lastDay = reviewedDays.has(today) ? today : shiftCalendarDay(today, -1);
  let streakDays = 0;
  while (reviewedDays.has(shiftCalendarDay(lastDay, -streakDays))) streakDays += 1;
  return streakDays;
}
