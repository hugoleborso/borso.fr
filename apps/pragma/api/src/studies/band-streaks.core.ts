import { type CalendarDay, mondayOfWeek } from './paris-day.core';
import { computeStreak, type Streak } from './streak.core';

export interface StudyDayRow {
  readonly memberId: string;
  readonly studiedOn: CalendarDay;
}

export interface StreakHolder {
  readonly memberId: string;
}

export interface MemberStreak {
  readonly streak: Streak;
  readonly studiesThisWeek: number;
}

// @FollowsBlueprint core-projection
export function buildMemberStreaks<TMember extends StreakHolder>(
  members: readonly TMember[],
  studies: readonly StudyDayRow[],
  today: CalendarDay,
): (TMember & MemberStreak)[] {
  const weekStart = mondayOfWeek(today);
  return members.map((member) => {
    const own = studies.filter((study) => study.memberId === member.memberId);
    return {
      ...member,
      streak: computeStreak(
        own.map((study) => study.studiedOn),
        today,
      ),
      studiesThisWeek: own.filter((study) => study.studiedOn >= weekStart).length,
    };
  });
}
