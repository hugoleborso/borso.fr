import type { DatabaseExecutor } from '../database/client';
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
import {
  deleteStudiesOfMember,
  deleteStudiesOfSong,
  listStudiesOfMemberSince,
} from './studies.repository';
export { listStudiesSince } from './studies.repository';
import type { ConcertReadiness, StudiesOverview } from './studies.types';
import { buildStudyQueue, type StudyCandidateSong, studyKey } from './study-queue.core';

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
  const today = parisCalendarDay(now);
  const [songs, defaultRows, overrideRows, studiesOfToday] = await Promise.all([
    getSongs(),
    getMasteryDefaults(),
    getAllMasteryOverrides(),
    listStudiesOfMemberSince(memberId, today),
  ]);
  const defaults = indexDefaultScores(defaultRows);
  const overrides = indexOverrideScores(overrideRows);
  const scope = await readConcertScope(songs, now, (song) =>
    isSongReady(defaults, overrides, song),
  );
  const keysStudiedToday = new Set(
    studiesOfToday.map((study) => studyKey(study.songId, study.instrumentId)),
  );
  return {
    today,
    queue: buildStudyQueue({
      memberId,
      songs: scope.candidates,
      defaults,
      overrides,
      keysStudiedToday,
    }),
    readiness: scope.readiness,
  };
}

export async function deleteStudiesOfDeletedMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteStudiesOfMember(executor, memberId);
}

export async function deleteStudiesOfDeletedSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<void> {
  await deleteStudiesOfSong(executor, songId);
}

export async function readStudiesOverviewForTool(memberId: string, now: Date) {
  const [overview, names] = await Promise.all([
    readStudiesOverview(memberId, now),
    readLineupNames(),
  ]);
  return projectOverviewForTool(overview, names.instruments);
}
