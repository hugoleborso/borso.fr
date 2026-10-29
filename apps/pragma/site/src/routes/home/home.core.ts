/** @Feature home */

import { type ScheduledSession, selectNextSession } from '@domain/session-schedule.core';
import { isTaskOpen } from '@domain/task-status.core';
import type { SetlistEditorSong } from '../../components/organisms/setlist-editor.utils';
import {
  describeMemberPartsByEntryId,
  type FilterableEntry,
  filterEntriesForMember,
  type MemberPart,
  type PartInstrument,
} from '../../components/organisms/setlist-filter.core';
import { sumKnownDurations } from '../../components/molecules/song-duration.utils';
import type { TaskShape } from '../band/band-tasks.core';
import { buildPracticePath } from '../sessions/session-page.core';

export interface HomeSong extends SetlistEditorSong {
  readonly durationSeconds?: number | null;
}

export interface HomeSetlist {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
}

export interface HomeViewInput {
  readonly setlist: HomeSetlist | null;
  readonly entries: readonly FilterableEntry[];
  readonly songs: readonly HomeSong[];
  readonly instruments: readonly PartInstrument[];
  readonly tasks: readonly TaskShape[];
  readonly memberId: string | null;
  readonly nextSessionId: string | null;
}

export interface MemberPartRow {
  readonly entryId: string;
  readonly songTitle: string;
  readonly parts: readonly MemberPart[];
}

export interface HomeView {
  readonly totalSeconds: number | null;
  readonly memberPart: readonly MemberPartRow[];
  readonly memberTasks: readonly TaskShape[];
}

function indexSongsById(songs: readonly HomeSong[]): Readonly<Record<string, HomeSong>> {
  return Object.fromEntries(songs.map((song) => [song.id, song]));
}

function selectMemberPart(
  input: HomeViewInput,
  songsById: Readonly<Record<string, HomeSong>>,
): readonly MemberPartRow[] {
  const filtered = filterEntriesForMember(input.entries, songsById, input.memberId);
  const partsByEntryId = describeMemberPartsByEntryId(
    filtered.instrumentIdsByEntryId,
    input.instruments,
  );
  return input.entries.flatMap((entry) => {
    const parts = partsByEntryId[entry.id];
    const song = songsById[entry.songId];
    // Stryker disable next-line ConditionalExpression: equivalent mutant, an entry has parts only when filterEntriesForMember found its song, so the song is always there once the parts are.
    if (parts === undefined || song === undefined) return [];
    return [{ entryId: entry.id, songTitle: song.title, parts }];
  });
}

function selectOpenTasksOf(
  tasks: readonly TaskShape[],
  memberId: string | null,
  nextSessionId: string | null,
): readonly TaskShape[] {
  if (memberId === null) return [];
  const open = tasks.filter((task) => task.assigneeId === memberId && isTaskOpen(task));
  const isForNextSession = (task: TaskShape): boolean =>
    nextSessionId !== null && task.sessionId === nextSessionId;
  return [...open.filter(isForNextSession), ...open.filter((task) => !isForNextSession(task))];
}

// @FollowsBlueprint core-view-projection-joining-two-lists
export function buildHomeView(input: HomeViewInput): HomeView {
  const songsById = indexSongsById(input.songs);
  const totalSeconds =
    input.setlist === null
      ? null
      : sumKnownDurations(input.entries.map((entry) => songsById[entry.songId]?.durationSeconds));
  return {
    totalSeconds,
    memberPart: selectMemberPart(input, songsById),
    memberTasks: selectOpenTasksOf(input.tasks, input.memberId, input.nextSessionId),
  };
}

export interface HomePrimaryLink {
  readonly to: string;
  readonly labelKey: 'home.openSetlist' | 'home.openSession' | 'home.startPractice';
  readonly icon: 'arrowR' | 'play';
  readonly startsPracticeMode: boolean;
}

export interface HomePrimaryAction {
  readonly link: HomePrimaryLink | null;
  readonly isNewSessionOffered: boolean;
}

export interface HomePrimaryActionInput {
  readonly isLoading: boolean;
  readonly nextSessionId: string | null;
  readonly setlistId: string | null;
  readonly isPracticeModeOffered: boolean;
}

// @FollowsBlueprint core-view-intent
export function selectHomePrimaryAction(input: HomePrimaryActionInput): HomePrimaryAction {
  if (input.nextSessionId !== null && input.isPracticeModeOffered) {
    return {
      link: {
        to: buildPracticePath(input.nextSessionId),
        labelKey: 'home.startPractice',
        icon: 'play',
        startsPracticeMode: true,
      },
      isNewSessionOffered: false,
    };
  }
  if (input.setlistId !== null) {
    return {
      link: {
        to: `/setlists/${input.setlistId}`,
        labelKey: 'home.openSetlist',
        icon: 'arrowR',
        startsPracticeMode: false,
      },
      isNewSessionOffered: false,
    };
  }
  if (input.nextSessionId !== null) {
    return {
      link: {
        to: `/sessions/${input.nextSessionId}`,
        labelKey: 'home.openSession',
        icon: 'arrowR',
        startsPracticeMode: false,
      },
      isNewSessionOffered: false,
    };
  }
  return { link: null, isNewSessionOffered: !input.isLoading };
}

export const HOME_SECTION_PARAM = 'view';
export type HomeSection = 'part' | 'tasks';
const TASKS_SECTION: HomeSection = 'tasks';

// @FollowsBlueprint core-decision
export function readHomeSection(requested: string | null, hasPart: boolean): HomeSection {
  return hasPart && requested !== TASKS_SECTION ? 'part' : TASKS_SECTION;
}

export interface KindedSession extends ScheduledSession {
  readonly kind: string;
}

const CONCERT_KIND = 'concert';

// @FollowsBlueprint core-decision
export function selectNextConcertBesideSession<TSession extends KindedSession>(
  sessions: readonly TSession[],
  nextSessionId: string | null,
  now: Date,
): TSession | null {
  const concerts = sessions.filter((session) => session.kind === CONCERT_KIND);
  const nextConcert = selectNextSession(concerts, now);
  if (nextConcert === null || nextConcert.id === nextSessionId) return null;
  return nextConcert;
}
