import { type CalendarDay, parisCalendarDay, shiftCalendarDay } from '@domain/paris-day.core';
import type { PersonalFlame } from '@domain/practice-flame.core';
import { getMembersSortedByFirstName } from '../members/members.service';
import { getSessions } from '../sessions/sessions.service';
import { listStudyDaysOfMemberSince, listStudyDaysSince } from '../studies/studies.service';
import {
  buildMemberFlames,
  buildOwnFlame,
  buildStreaksView,
  collectSessionDays,
} from './streaks.core';
import type { MemberFlame, StreaksView } from './streaks.types';

export const STREAK_LOOKBACK_DAYS = 400;

function firstLookbackDay(today: CalendarDay): CalendarDay {
  return shiftCalendarDay(today, -STREAK_LOOKBACK_DAYS);
}

async function readFlameInputs(now: Date) {
  const today = parisCalendarDay(now);
  const firstDay = firstLookbackDay(today);
  const [sessions, members, studies] = await Promise.all([
    getSessions(now),
    getMembersSortedByFirstName(),
    listStudyDaysSince(firstDay),
  ]);
  return {
    today,
    members,
    studies,
    sessionDays: collectSessionDays(sessions, firstDay, today),
  };
}

// @FollowsBlueprint service-clock-injected
export async function readStreaks(memberId: string, now: Date): Promise<StreaksView> {
  return buildStreaksView({ ...(await readFlameInputs(now)), memberId });
}

export async function readMemberFlames(now: Date): Promise<MemberFlame[]> {
  return buildMemberFlames(await readFlameInputs(now));
}

export async function readPersonalFlame(memberId: string, now: Date): Promise<PersonalFlame> {
  const today = parisCalendarDay(now);
  const firstDay = firstLookbackDay(today);
  const [sessions, studies] = await Promise.all([
    getSessions(now),
    listStudyDaysOfMemberSince(memberId, firstDay),
  ]);
  return buildOwnFlame({
    today,
    memberId,
    studies,
    sessionDays: collectSessionDays(sessions, firstDay, today),
  });
}
