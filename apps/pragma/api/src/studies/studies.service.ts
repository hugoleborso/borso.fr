import type { Lineup } from '@domain/lineup.core';
import type { DatabaseExecutor } from '../database/client';
import { projectOverviewForTool } from './study-tool.core';
import { indexDefaultScores, indexOverrideScores } from '../mastery/mastery.core';
import { getAllMasteryOverrides, getMasteryDefaults } from '../mastery/mastery.service';
import {
  didClaimInstrumentsWithin,
  readLineupNames,
  resolveInstrumentId,
} from '../instruments/instruments.service';
import { getMembersSortedByFirstName } from '../members/members.service';
import { getSessions } from '../sessions/sessions.service';
import { buildStreaksView, collectSessionDays, firstLookbackDay } from '../streaks/streaks.core';
import type { StreaksView } from '../streaks/streaks.types';
import {
  getAllSetlists,
  getEntriesOfSetlists,
  getEntriesOfSongWithin,
} from '../setlists/setlists.service';
import {
  didClaimSongWithin,
  findSongByIdWithin,
  getSongs,
  resolveSongId,
  type SongRow,
} from '../songs/songs.service';
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
  deleteStudyWithin,
  insertStudyIfAbsentWithin,
  listStudiesOfMemberSince,
  listStudiesSince,
  listStudiesSinceWithin,
  runInOneStudyTransaction,
} from './studies.repository';
export { listStudiesOfMemberSince } from './studies.repository';
import type { StudyLogInput } from './studies.schema';
import type {
  ConcertReadiness,
  StudyRow,
  StudiesOverview,
  StudyUndoOutcome,
  StudyUndoWithStreaks,
  StudyWriteOutcome,
  StudyWriteWithStreaks,
} from './studies.types';
import { hasInstrumentInAnyLineup } from './study-eligibility.core';
import { buildStudyQueue, type StudyCandidateSong, studyKey } from './study-queue.core';

interface StudyCommand extends StudyLogInput {
  readonly memberId: string;
  readonly now: Date;
}

async function readLineupsOfSongWithin(
  executor: DatabaseExecutor,
  song: SongRow,
): Promise<Lineup[]> {
  const songEntries = await getEntriesOfSongWithin(executor, song.id);
  const lineupsWithOverrides = groupLineupsBySong(
    songEntries,
    new Map([[song.id, song.defaultLineup]]),
  );
  return [song.defaultLineup, ...lineupsWithOverrides.flatMap((grouped) => grouped.lineups)];
}

function studyOfToday(command: StudyCommand): StudyRow {
  return {
    memberId: command.memberId,
    songId: command.songId,
    instrumentId: command.instrumentId,
    studiedOn: parisCalendarDay(command.now),
  };
}

type StudiesLister = typeof listStudiesSince;

async function readFlameInputsWith(now: Date, listStudies: StudiesLister) {
  const today = parisCalendarDay(now);
  const firstDay = firstLookbackDay(today);
  const [sessions, members, studies] = await Promise.all([
    getSessions(now),
    getMembersSortedByFirstName(),
    listStudies(firstDay),
  ]);
  return {
    today,
    members,
    studies,
    sessionDays: collectSessionDays(sessions, firstDay, today),
  };
}

export async function readFlameInputs(now: Date) {
  return await readFlameInputsWith(now, listStudiesSince);
}

async function readStreaksWithin(
  executor: DatabaseExecutor,
  memberId: string,
  now: Date,
): Promise<StreaksView> {
  const inputs = await readFlameInputsWith(
    now,
    async (firstDay) => await listStudiesSinceWithin(executor, firstDay),
  );
  return buildStreaksView({ ...inputs, memberId });
}

async function logStudyWithin(
  executor: DatabaseExecutor,
  command: StudyCommand,
): Promise<StudyWriteOutcome> {
  const study = studyOfToday(command);
  const isSongClaimed = await didClaimSongWithin(executor, study.songId);
  if (!isSongClaimed) return { kind: 'song-not-found' };
  const isInstrumentClaimed = await didClaimInstrumentsWithin(executor, [study.instrumentId]);
  if (!isInstrumentClaimed) return { kind: 'instrument-not-found' };
  const song = await findSongByIdWithin(executor, study.songId);
  if (song === null) return { kind: 'song-not-found' };
  const lineups = await readLineupsOfSongWithin(executor, song);
  if (!hasInstrumentInAnyLineup(lineups, study.memberId, study.instrumentId)) {
    return { kind: 'study-not-in-lineup' };
  }
  await insertStudyIfAbsentWithin(executor, study, command.now);
  return { kind: 'ok', study };
}

// @FollowsBlueprint service-clock-injected
export async function logStudy(command: StudyCommand): Promise<StudyWriteOutcome> {
  return await runInOneStudyTransaction(
    async (executor) => await logStudyWithin(executor, command),
  );
}

async function undoStudyWithin(
  executor: DatabaseExecutor,
  command: StudyCommand,
): Promise<StudyUndoOutcome> {
  const deletedCount = await deleteStudyWithin(executor, studyOfToday(command));
  if (deletedCount === 0) return { kind: 'study-not-found' };
  return { kind: 'ok' };
}

export async function undoStudy(command: StudyCommand): Promise<StudyUndoOutcome> {
  return await runInOneStudyTransaction(
    async (executor) => await undoStudyWithin(executor, command),
  );
}

export async function logStudyWithStreaks(command: StudyCommand): Promise<StudyWriteWithStreaks> {
  return await runInOneStudyTransaction(async (executor): Promise<StudyWriteWithStreaks> => {
    const outcome = await logStudyWithin(executor, command);
    if (outcome.kind !== 'ok') return outcome;
    return {
      ...outcome,
      streaks: await readStreaksWithin(executor, command.memberId, command.now),
    };
  });
}

export async function undoStudyWithStreaks(command: StudyCommand): Promise<StudyUndoWithStreaks> {
  return await runInOneStudyTransaction(async (executor): Promise<StudyUndoWithStreaks> => {
    const outcome = await undoStudyWithin(executor, command);
    if (outcome.kind !== 'ok') return outcome;
    return {
      kind: 'ok',
      streaks: await readStreaksWithin(executor, command.memberId, command.now),
    };
  });
}

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

export interface StudyToolCommand {
  readonly songReference: string;
  readonly instrumentReference: string;
  readonly isUndoing: boolean;
  readonly memberId: string;
  readonly now: Date;
}

export async function writeStudyForTool(
  command: StudyToolCommand,
): Promise<StudyWriteOutcome | StudyUndoOutcome> {
  const [songId, instrumentId] = await Promise.all([
    resolveSongId(command.songReference),
    resolveInstrumentId(command.instrumentReference),
  ]);
  const study = { songId, instrumentId, memberId: command.memberId, now: command.now };
  if (command.isUndoing) return await undoStudy(study);
  return await logStudy(study);
}
