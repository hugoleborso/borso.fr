import { type NamedEntity, nameEntity } from '../instruments/lineup-names.core';
import type { MemberStreak } from './band-streaks.core';
import type { Streak } from './streak.core';
import type { StudiesOverview } from './studies.types';

function describeStreak(streak: Streak) {
  return {
    days: streak.days,
    isTodayCounted: streak.isTodayCounted,
    isJokerAvailable: streak.isJokerAvailable,
  };
}

export function describeOwnLine(line: MemberStreak) {
  return { streak: line.streak.days, thisWeek: line.studiesThisWeek };
}

// @FollowsBlueprint core-projection
export function projectOverviewForTool(
  overview: StudiesOverview,
  instruments: readonly NamedEntity[],
) {
  const readiness = overview.readiness;
  return {
    today: overview.today,
    myStreak: describeStreak(overview.myStreak),
    queue: overview.queue.map((item) => ({
      song: item.title,
      songId: item.songId,
      instrument: nameEntity(instruments, item.instrumentId),
      score: item.score,
      isReady: item.isReady,
      isStudiedToday: item.isStudiedToday,
    })),
    band: overview.band.map((member) => ({
      firstName: member.firstName,
      streak: member.streak.days,
      thisWeek: member.studiesThisWeek,
    })),
    readiness:
      readiness === null
        ? null
        : {
            concertId: readiness.concertId,
            date: readiness.date,
            venue: readiness.venue,
            ready: readiness.songs.filter((song) => song.isReady).map((song) => song.title),
            notReady: readiness.songs.filter((song) => !song.isReady).map((song) => song.title),
          },
  };
}
