/** @Feature home */

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
): readonly TaskShape[] {
  if (memberId === null) return [];
  return tasks.filter((task) => task.assigneeId === memberId && isTaskOpen(task));
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
    memberTasks: selectOpenTasksOf(input.tasks, input.memberId),
  };
}

export interface HomePrimaryLink {
  readonly to: string;
  readonly labelKey: 'home.openSetlist' | 'home.openSession';
}

export interface HomePrimaryAction {
  readonly link: HomePrimaryLink | null;
  readonly isNewSessionOffered: boolean;
}

export interface HomePrimaryActionInput {
  readonly isLoading: boolean;
  readonly nextSessionId: string | null;
  readonly setlistId: string | null;
}

// @FollowsBlueprint core-view-intent
export function selectHomePrimaryAction(input: HomePrimaryActionInput): HomePrimaryAction {
  if (input.setlistId !== null) {
    return {
      link: { to: `/setlists/${input.setlistId}`, labelKey: 'home.openSetlist' },
      isNewSessionOffered: false,
    };
  }
  if (input.nextSessionId !== null) {
    return {
      link: { to: `/sessions/${input.nextSessionId}`, labelKey: 'home.openSession' },
      isNewSessionOffered: false,
    };
  }
  return { link: null, isNewSessionOffered: !input.isLoading };
}
