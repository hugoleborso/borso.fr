import { type NamedEntity, nameEntity } from '../instruments/lineup-names.core';
import type { StudiesOverview } from './studies.types';

// @FollowsBlueprint core-projection
export function projectOverviewForTool(
  overview: StudiesOverview,
  instruments: readonly NamedEntity[],
) {
  const readiness = overview.readiness;
  return {
    today: overview.today,
    queue: overview.queue.map((item) => ({
      song: item.title,
      songId: item.songId,
      instrument: nameEntity(instruments, item.instrumentId),
      score: item.score,
      isReady: item.isReady,
      isStudiedToday: item.isStudiedToday,
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
