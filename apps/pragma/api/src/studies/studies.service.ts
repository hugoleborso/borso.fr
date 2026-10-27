import type { Lineup } from '@domain/lineup.core';
import type { DatabaseExecutor } from '../database/client';
import { indexDefaultScores, indexOverrideScores } from '../mastery/mastery.core';
import { getAllMasteryOverrides, getMasteryDefaults } from '../mastery/mastery.service';
import { didClaimInstrumentsWithin } from '../instruments/instruments.service';
import { getMembersSortedByFirstName } from '../members/members.service';
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
  type SongRow,
} from '../songs/songs.service';
import { buildMemberStreaks, type MemberStreak } from './band-streaks.core';
import {
  groupLineupsBySong,
  isSongReady,
  selectEarliestUpcomingConcert,
  type SongLineups,
} from './concert-readiness.core';
import { type CalendarDay, parisCalendarDay, shiftCalendarDay } from './paris-day.core';
import { computeStreak } from './streak.core';
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

export const STREAK_LOOKBACK_DAYS = 400;

interface StudyCommand extends StudyLogInput {
  readonly memberId: string;
  readonly now: Date;
}

function firstLookbackDay(today: CalendarDay): CalendarDay {
  return shiftCalendarDay(today, -STREAK_LOOKBACK_DAYS);
}

async function readOwnLine(memberId: string, today: CalendarDay): Promise<MemberStreak> {
  const ownStudies = await listStudiesOfMemberSince(memberId, firstLookbackDay(today));
  const [ownLine] = buildMemberStreaks([{ memberId }], ownStudies, today);
  return {
    streak: ownLine?.streak ?? computeStreak([], today),
    studiesThisWeek: ownLine?.studiesThisWeek ?? 0,
  };
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
  return { kind: 'ok', study, myLine: await readOwnLine(command.memberId, today) };
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
  return { kind: 'ok', myLine: await readOwnLine(command.memberId, today) };
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
  const nextConcert = selectEarliestUpcomingConcert(await getSessions(), now);
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
  const [songs, members, defaultRows, overrideRows, studies] = await Promise.all([
    getSongs(),
    getMembersSortedByFirstName(),
    getMasteryDefaults(),
    getAllMasteryOverrides(),
    listStudiesSince(firstLookbackDay(today)),
  ]);
  const defaults = indexDefaultScores(defaultRows);
  const overrides = indexOverrideScores(overrideRows);
  const scope = await readConcertScope(songs, now, (song) =>
    isSongReady(defaults, overrides, song),
  );
  const keysStudiedToday = new Set(
    studies
      .filter((study) => study.memberId === memberId && study.studiedOn === today)
      .map((study) => studyKey(study.songId, study.instrumentId)),
  );
  const band = buildMemberStreaks(
    members.map((member) => ({
      memberId: member.id,
      firstName: member.firstName,
      color: member.color,
    })),
    studies,
    today,
  );
  const ownStudyDays = studies
    .filter((study) => study.memberId === memberId)
    .map((study) => study.studiedOn);
  return {
    today,
    myStreak: computeStreak(ownStudyDays, today),
    queue: buildStudyQueue({
      memberId,
      songs: scope.candidates,
      defaults,
      overrides,
      keysStudiedToday,
    }),
    band,
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

export { defineTool } from '../mcp/mcp.service';
