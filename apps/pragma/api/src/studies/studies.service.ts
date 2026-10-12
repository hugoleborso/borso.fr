import type { Lineup } from '@domain/lineup.core';
import type { DatabaseExecutor } from '../database/client';
import { indexDefaultScores, indexOverrideScores } from '../mastery/mastery.core';
import { getAllMasteryOverrides, getMasteryDefaults } from '../mastery/mastery.service';
import { getMembersSortedByFirstName } from '../members/members.service';
import { getSessions } from '../sessions/sessions.service';
import {
  getAllSetlists,
  getEntriesOfSetlists,
  getEntriesOfSong,
} from '../setlists/setlists.service';
import { getSongById, getSongs, type SongRow } from '../songs/songs.service';
import { buildMemberStreaks } from './band-streaks.core';
import {
  groupLineupsBySong,
  isSongReady,
  selectNextConcert,
  type SongLineups,
} from './concert-readiness.core';
import { type CalendarDay, parisCalendarDay, shiftCalendarDay } from './paris-day.core';
import { computeStreak, type Streak } from './streak.core';
import {
  deleteStudiesOfMember,
  deleteStudiesOfSong,
  deleteStudy,
  insertStudyIfAbsent,
  listStudiesSince,
  listStudyDaysOfMemberSince,
} from './studies.repository';
import type { StudyLogInput } from './studies.schema';
import type {
  ConcertReadiness,
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

async function readOwnStreak(memberId: string, today: CalendarDay): Promise<Streak> {
  const days = await listStudyDaysOfMemberSince(memberId, firstLookbackDay(today));
  return computeStreak(days, today);
}

async function readLineupsOfSong(song: SongRow): Promise<Lineup[]> {
  const songEntries = await getEntriesOfSong(song.id);
  const lineupsWithOverrides = groupLineupsBySong(
    songEntries,
    new Map([[song.id, song.defaultLineup]]),
  );
  return [song.defaultLineup, ...lineupsWithOverrides.flatMap((grouped) => grouped.lineups)];
}

// @FollowsBlueprint service-clock-injected
export async function logStudy(command: StudyCommand): Promise<StudyWriteOutcome> {
  const song = await getSongById(command.songId);
  if (song === null) return { kind: 'song-not-found' };
  const lineups = await readLineupsOfSong(song);
  if (!hasInstrumentInAnyLineup(lineups, command.memberId, command.instrumentId)) {
    return { kind: 'study-not-in-lineup' };
  }
  const today = parisCalendarDay(command.now);
  const study = {
    memberId: command.memberId,
    songId: command.songId,
    instrumentId: command.instrumentId,
    studiedOn: today,
  };
  await insertStudyIfAbsent(study, command.now);
  return { kind: 'ok', study, myStreak: await readOwnStreak(command.memberId, today) };
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
  return { kind: 'ok', myStreak: await readOwnStreak(command.memberId, today) };
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
  const nextConcert = selectNextConcert(await getSessions(), now);
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
