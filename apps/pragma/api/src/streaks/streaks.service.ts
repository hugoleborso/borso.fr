import { parisCalendarDay } from '@domain/paris-day.core';
import { getSessions } from '../sessions/sessions.service';
import { buildStreaksView, collectSessionDays, firstLookbackDay } from './streaks.core';
import type { StreaksView } from './streaks.types';

// @FollowsBlueprint service-clock-injected
export async function readStreaks(now: Date): Promise<StreaksView> {
  const today = parisCalendarDay(now);
  const sessions = await getSessions(now);
  return buildStreaksView({
    today,
    sessionDays: collectSessionDays(sessions, firstLookbackDay(today), today),
  });
}
