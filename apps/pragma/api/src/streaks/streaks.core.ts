import { type CalendarDay, parisCalendarDay, shiftCalendarDay } from '@domain/paris-day.core';
import {
  computeBandFlame,
  computePersonalFlame,
  type PersonalFlame,
} from '@domain/practice-flame.core';
import type { MemberFlame, StreaksView } from './streaks.types';

export const STREAK_LOOKBACK_DAYS = 400;

interface StreaksMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

interface PresenceDay {
  readonly memberId: string;
  readonly presentOn: CalendarDay;
}

interface DatedSession {
  readonly date: Date;
}

interface OwnFlameInput {
  readonly today: CalendarDay;
  readonly memberId: string;
  readonly presences: readonly PresenceDay[];
  readonly sessionDays: ReadonlySet<CalendarDay>;
}

interface MemberFlamesInput {
  readonly today: CalendarDay;
  readonly members: readonly StreaksMember[];
  readonly presences: readonly PresenceDay[];
  readonly sessionDays: ReadonlySet<CalendarDay>;
}

interface StreaksInput extends MemberFlamesInput {
  readonly memberId: string;
}

function memberDaysOf(
  presences: readonly PresenceDay[],
  isCounted: (memberId: string) => boolean,
): CalendarDay[] {
  return presences
    .filter((presence) => isCounted(presence.memberId))
    .map((presence) => presence.presentOn);
}

const NO_DAY = new Set<CalendarDay>();

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

export function buildOwnFlame(input: OwnFlameInput): PersonalFlame {
  const ownDays = memberDaysOf(input.presences, (memberId) => memberId === input.memberId);
  return computePersonalFlame(ownDays, input.sessionDays, input.today);
}

export function buildMemberFlames(input: MemberFlamesInput): MemberFlame[] {
  return input.members.map((member) => ({
    memberId: member.id,
    firstName: member.firstName,
    color: member.color,
    flame: buildOwnFlame({ ...input, memberId: member.id }),
  }));
}

// @FollowsBlueprint core-projection
export function buildStreaksView(input: StreaksInput): StreaksView {
  const members = buildMemberFlames(input);
  const currentMemberIds = new Set(input.members.map((member) => member.id));
  const bandMemberDays = memberDaysOf(input.presences, (memberId) =>
    currentMemberIds.has(memberId),
  );
  const mine = members.find((member) => member.memberId === input.memberId)?.flame;
  return {
    today: input.today,
    mine: mine ?? computePersonalFlame(NO_DAY, NO_DAY, input.today),
    band: computeBandFlame(new Set([...input.sessionDays, ...bandMemberDays]), input.today),
    members,
  };
}

export function projectStreaksForTool(view: StreaksView) {
  return {
    mine: {
      days: view.mine.days,
      isTodayCounted: view.mine.isTodayCounted,
      jokersLeftThisWeek: view.mine.jokersLeftThisWeek,
    },
    band: view.band,
    members: view.members.map((member) => ({
      firstName: member.firstName,
      days: member.flame.days,
      isTodayCounted: member.flame.isTodayCounted,
    })),
  };
}
