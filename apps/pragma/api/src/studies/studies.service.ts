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
import { getSessions } from '../sessions/sessions.service';
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
import { type CalendarDay, parisCalendarDay } from '@domain/paris-day.core';
import {
  deleteStudiesOfMember,
  deleteStudiesOfSong,
  deleteStudy,
  insertStudyIfAbsentWithin,
  listStudiesSince,
  listStudiesOfMemberSince,
  runInOneStudyTransaction,
} from './studies.repository';
import type { StudyLogInput } from './studies.schema';
import type {
  ConcertReadiness,
  StudyRow,
  StudiesOverview,
  StudyUndoOutcome,
  StudyWriteOutcome,
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

type StudyRecording = { readonly kind: 'recorded' } | Exclude<StudyWriteOutcome, { kind: 'ok' }>;

async function recordStudy(study: StudyRow, createdAt: Date): Promise<StudyRecording> {
  return await runInOneStudyTransaction(async (executor): Promise<StudyRecording> => {
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
    await insertStudyIfAbsentWithin(executor, study, createdAt);
    return { kind: 'recorded' };
  });
}

// @FollowsBlueprint service-clock-injected
export async function logStudy(command: StudyCommand): Promise<StudyWriteOutcome> {
  const today = parisCalendarDay(command.now);
  const study: StudyRow = {
    memberId: command.memberId,
    songId: command.songId,
    instrumentId: command.instrumentId,
    studiedOn: today,
  };
  const recording = await recordStudy(study, command.now);
  if (recording.kind !== 'recorded') return recording;
  return { kind: 'ok', study };
}

export async function undoStudy(command: StudyCommand): Promise<StudyUndoOutcome> {
  const today = parisCalendarDay(command.now);
  const deletedCount = await deleteStudy({
    memberId: command.memberId,
    songId: command.songId,
    instrumentId: command.instrumentId,
    studiedOn: today,
  });
  if (deletedCount === 0) return { kind: 'study-not-found' };
  return { kind: 'ok' };
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

// @FollowsBlueprint service-passthrough
export async function listStudyDaysSince(firstDay: CalendarDay): Promise<StudyRow[]> {
  return await listStudiesSince(firstDay);
}

export async function listStudyDaysOfMemberSince(
  memberId: string,
  firstDay: CalendarDay,
): Promise<StudyRow[]> {
  return await listStudiesOfMemberSince(memberId, firstDay);
}
