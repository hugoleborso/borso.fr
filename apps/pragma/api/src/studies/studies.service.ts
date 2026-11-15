import { projectOverviewForTool } from './study-tool.core';
import { indexDefaultScores, indexOverrideScores } from '../mastery/mastery.core';
import { getAllMasteryOverrides, getMasteryDefaults } from '../mastery/mastery.service';
import { readLineupNames } from '../instruments/instruments.service';
import { getSessions } from '../sessions/sessions.service';
import { getAllSetlists, getEntriesOfSetlists } from '../setlists/setlists.service';
import { getSongs, type SongRow } from '../songs/songs.service';
import {
  groupLineupsBySong,
  isSongReady,
  selectEarliestUpcomingConcert,
  type SongLineups,
} from './concert-readiness.core';
import { parisCalendarDay } from '@domain/paris-day.core';
import type { ConcertReadiness, StudiesOverview } from './studies.types';
import { buildStudyQueue, type StudyCandidateSong } from './study-queue.core';

interface ConcertScope {
  readonly readiness: ConcertReadiness | null;
  readonly candidates: StudyCandidateSong[];
}

function buildCatalogueScope(songs: readonly SongRow[]): ConcertScope {
  return {
    readiness: null,
    candidates: songs.map((song) => ({
      songId: song.id,
      title: song.title,
      lineups: [song.defaultLineup],
      isReady: null,
    })),
  };
}

async function readConcertScope(
  songs: readonly SongRow[],
  now: Date,
  isReady: (song: SongLineups) => boolean,
): Promise<ConcertScope> {
  const nextConcert = selectEarliestUpcomingConcert(await getSessions(now), now);
  if (nextConcert === null) return buildCatalogueScope(songs);
  const setlistIds = (await getAllSetlists())
    .filter((setlist) => setlist.sessionIds.includes(nextConcert.id))
    .map((setlist) => setlist.id);
  const concertEntries = await getEntriesOfSetlists(setlistIds);
  if (concertEntries.length === 0) return buildCatalogueScope(songs);
  const songsById = new Map(songs.map((song) => [song.id, song]));
  const defaultLineupBySong = new Map(songs.map((song) => [song.id, song.defaultLineup]));
  const candidates = groupLineupsBySong(concertEntries, defaultLineupBySong).map((grouped) => ({
    songId: grouped.songId,
    title: songsById.get(grouped.songId)?.title ?? '',
    lineups: grouped.lineups,
    isReady: isReady(grouped),
  }));
  return {
    readiness: {
      concertId: nextConcert.id,
      date: nextConcert.date.toISOString(),
      venue: nextConcert.venue,
      songs: candidates.map((candidate) => ({
        songId: candidate.songId,
        title: candidate.title,
        isReady: candidate.isReady,
      })),
    },
    candidates,
  };
}

// @FollowsBlueprint service-clock-injected
export async function readStudiesOverview(memberId: string, now: Date): Promise<StudiesOverview> {
  const [songs, defaultRows, overrideRows] = await Promise.all([
    getSongs(),
    getMasteryDefaults(),
    getAllMasteryOverrides(),
  ]);
  const defaults = indexDefaultScores(defaultRows);
  const overrides = indexOverrideScores(overrideRows);
  const scope = await readConcertScope(songs, now, (song) =>
    isSongReady(defaults, overrides, song),
  );
  return {
    today: parisCalendarDay(now),
    queue: buildStudyQueue({
      memberId,
      songs: scope.candidates,
      defaults,
      overrides,
    }),
    readiness: scope.readiness,
  };
}

export async function readStudiesOverviewForTool(memberId: string, now: Date) {
  const [overview, names] = await Promise.all([
    readStudiesOverview(memberId, now),
    readLineupNames(),
  ]);
  return projectOverviewForTool(overview, names.instruments);
}
