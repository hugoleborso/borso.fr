import { parisCalendarDay } from '@domain/paris-day.core';
import type { PersonalFlame } from '@domain/practice-flame.core';
import { getMembersSortedByFirstName } from '../members/members.service';
import { getSessions } from '../sessions/sessions.service';
import {
  buildMemberFlames,
  buildOwnFlame,
  buildStreaksView,
  collectSessionDays,
  firstLookbackDay,
} from './streaks.core';
import { recordPresence } from './presences.service';
import { listPresencesSince } from './streaks.repository';
import type { MemberFlame, StreaksView } from './streaks.types';

async function readFlameInputs(now: Date) {
  const today = parisCalendarDay(now);
  const firstDay = firstLookbackDay(today);
  const [sessions, members, presences] = await Promise.all([
    getSessions(now),
    getMembersSortedByFirstName(),
    listPresencesSince(firstDay),
  ]);
  return {
    today,
    members,
    presences,
    sessionDays: collectSessionDays(sessions, firstDay, today),
  };
}

// @FollowsBlueprint service-clock-injected
export async function readStreaks(memberId: string, now: Date): Promise<StreaksView> {
  return buildStreaksView({ ...(await readFlameInputs(now)), memberId });
}

export async function readStreaksOnOpening(memberId: string, now: Date): Promise<StreaksView> {
  await recordPresence(memberId, now);
  return await readStreaks(memberId, now);
}

export async function readMemberFlames(now: Date): Promise<MemberFlame[]> {
  return buildMemberFlames(await readFlameInputs(now));
}

export async function readPersonalFlame(memberId: string, now: Date): Promise<PersonalFlame> {
  return buildOwnFlame({ ...(await readFlameInputs(now)), memberId });
}
