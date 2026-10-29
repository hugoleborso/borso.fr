import { type CalendarDay, parisCalendarDay } from '@domain/paris-day.core';
import {
  computeBandFlame,
  computePersonalFlame,
  type PersonalFlame,
} from '@domain/practice-flame.core';
import type { MemberFlame, StreaksView } from './streaks.types';

interface StreaksMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

interface StudyDay {
  readonly memberId: string;
  readonly studiedOn: CalendarDay;
}

interface DatedSession {
  readonly date: Date;
}

interface OwnFlameInput {
  readonly today: CalendarDay;
  readonly memberId: string;
  readonly studies: readonly StudyDay[];
  readonly sessionDays: ReadonlySet<CalendarDay>;
}

interface MemberFlamesInput {
  readonly today: CalendarDay;
  readonly members: readonly StreaksMember[];
  readonly studies: readonly StudyDay[];
  readonly sessionDays: ReadonlySet<CalendarDay>;
}

interface StreaksInput extends MemberFlamesInput {
  readonly memberId: string;
}

function activeDaysOf(
  memberId: string,
  studies: readonly StudyDay[],
  sessionDays: ReadonlySet<CalendarDay>,
): Set<CalendarDay> {
  const ownStudyDays = studies
    .filter((study) => study.memberId === memberId)
    .map((study) => study.studiedOn);
  return new Set([...sessionDays, ...ownStudyDays]);
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
  return computePersonalFlame(
    activeDaysOf(input.memberId, input.studies, input.sessionDays),
    input.today,
  );
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
  const bandStudyDays = input.studies
    .filter((study) => currentMemberIds.has(study.memberId))
    .map((study) => study.studiedOn);
  const mine = members.find((member) => member.memberId === input.memberId)?.flame;
  return {
    today: input.today,
    mine: mine ?? computePersonalFlame(new Set(), input.today),
    band: computeBandFlame(new Set([...input.sessionDays, ...bandStudyDays]), input.today),
    members,
  };
}

export function projectStreaksForTool(view: StreaksView) {
  return {
    mine: view.mine,
    band: view.band,
    members: view.members.map((member) => ({
      firstName: member.firstName,
      days: member.flame.days,
      isTodayCounted: member.flame.isTodayCounted,
    })),
  };
}
