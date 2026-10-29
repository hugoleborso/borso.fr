import { parisCalendarDay } from '@domain/paris-day.core';
import type { PersonalFlame } from '@domain/practice-flame.core';
import { getSessions } from '../sessions/sessions.service';
import { listStudiesOfMemberSince, readFlameInputs } from '../studies/studies.service';
import {
  buildMemberFlames,
  buildOwnFlame,
  buildStreaksView,
  collectSessionDays,
  firstLookbackDay,
} from './streaks.core';
import type { MemberFlame, StreaksView } from './streaks.types';

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
    listStudiesOfMemberSince(memberId, firstDay),
  ]);
  return buildOwnFlame({
    today,
    memberId,
    studies,
    sessionDays: collectSessionDays(sessions, firstDay, today),
  });
}
