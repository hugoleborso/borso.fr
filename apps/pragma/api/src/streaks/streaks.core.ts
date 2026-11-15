import { type CalendarDay, parisCalendarDay, shiftCalendarDay } from '@domain/paris-day.core';
import { computeBandFlame, computePersonalFlame } from '@domain/practice-flame.core';
import type { StreaksView } from './streaks.types';

export const STREAK_LOOKBACK_DAYS = 400;

interface DatedSession {
  readonly date: Date;
}

interface StreaksInput {
  readonly today: CalendarDay;
  readonly sessionDays: ReadonlySet<CalendarDay>;
}

export function firstLookbackDay(today: CalendarDay): CalendarDay {
  return shiftCalendarDay(today, -STREAK_LOOKBACK_DAYS);
}

export function collectSessionDays(
  sessions: readonly DatedSession[],
  firstDay: CalendarDay,
  today: CalendarDay,
): Set<CalendarDay> {
  const days = sessions.map((session) => parisCalendarDay(session.date));
  return new Set(days.filter((day) => day >= firstDay && day <= today));
}

// @FollowsBlueprint core-projection
export function buildStreaksView(input: StreaksInput): StreaksView {
  return {
    today: input.today,
    mine: computePersonalFlame(input.sessionDays, input.today),
    band: computeBandFlame(input.sessionDays, input.today),
  };
}

export function projectStreaksForTool(view: StreaksView) {
  return { mine: view.mine, band: view.band };
}
