/** @Feature sessions */

import { bandDayOf } from '@domain/session-schedule.core';
import type { Lineup } from '@domain/lineup.core';
import { sumKnownDurations } from '../../components/molecules/song-duration.utils';
import {
  compactLineup,
  lineupOf,
  type SetlistEditorSong,
} from '../../components/organisms/setlist-editor.utils';

export const SETLIST_PREVIEW_SIZE = 3;

export interface PreviewEntry {
  readonly id: string;
  readonly songId: string;
  readonly position: number;
  readonly lineupOverride: Lineup | null;
}

export interface PreviewSong extends SetlistEditorSong {
  readonly durationSeconds?: number | null;
}

export interface SetlistPreviewRow {
  readonly entryId: string;
  readonly songId: string;
  readonly title: string;
  readonly deezerAlbumId: string | null;
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly hasNoLineup: boolean;
}

export interface SetlistPreview {
  readonly songCount: number;
  readonly totalSeconds: number | null;
  readonly rows: readonly SetlistPreviewRow[];
}

function byPosition(left: PreviewEntry, right: PreviewEntry): number {
  return left.position - right.position;
}

// @FollowsBlueprint core-view-projection
export function buildSetlistPreview(
  entries: readonly PreviewEntry[],
  songsById: Readonly<Record<string, PreviewSong>>,
): SetlistPreview {
  const ordered = entries.toSorted(byPosition);
  const rows = ordered.slice(0, SETLIST_PREVIEW_SIZE).map((entry): SetlistPreviewRow => {
    const song = songsById[entry.songId];
    const lineup = compactLineup(lineupOf(entry, songsById));
    return {
      entryId: entry.id,
      songId: entry.songId,
      title: song?.title ?? '',
      deezerAlbumId: song?.deezerAlbumId ?? null,
      lineup,
      hasNoLineup: Object.keys(lineup).length === 0,
    };
  });
  return {
    songCount: ordered.length,
    totalSeconds:
      ordered.length === 0
        ? null
        : sumKnownDurations(ordered.map((entry) => songsById[entry.songId]?.durationSeconds)),
    rows,
  };
}

export interface SessionTake {
  readonly id: string;
  readonly songId: string;
}

export interface SessionTakeGroup<TTake extends SessionTake> {
  readonly songId: string;
  readonly songTitle: string;
  readonly takes: readonly TTake[];
}

// @FollowsBlueprint core-view-projection
export function groupTakesBySong<TTake extends SessionTake>(
  takes: readonly TTake[],
  songTitleOf: (songId: string) => string,
): readonly SessionTakeGroup<TTake>[] {
  const songIds = [...new Set(takes.map((take) => take.songId))];
  return songIds.map((songId) => ({
    songId,
    songTitle: songTitleOf(songId),
    takes: takes.filter((take) => take.songId === songId),
  }));
}

export function findSelectedTakeOfSong<TTake extends SessionTake>(
  takes: readonly TTake[],
  selectedTakeId: string | null,
  songId: string,
): TTake | null {
  return takes.find((take) => take.id === selectedTakeId && take.songId === songId) ?? null;
}

export interface PreparedConcertPickerInput {
  readonly sessionDate: string;
  readonly preparedConcertId: string | null;
  readonly now: Date;
}

// @FollowsBlueprint core-decision
export function isPreparedConcertPickerShown(input: PreparedConcertPickerInput): boolean {
  const isPast = bandDayOf(input.sessionDate) < bandDayOf(input.now);
  return !isPast || input.preparedConcertId !== null;
}

export interface SessionPills {
  readonly practicePath: string | null;
  readonly setlistPath: string | null;
  readonly setlistVariant: 'primary' | 'secondary';
  readonly isAddSongsShown: boolean;
}

const NO_PILLS: SessionPills = {
  practicePath: null,
  setlistPath: null,
  setlistVariant: 'primary',
  isAddSongsShown: false,
};

export interface SessionPrimaryActionsInput {
  readonly isLoading: boolean;
  readonly sessionId: string;
  readonly firstSetlistId: string | null;
  readonly isPracticeModeOffered: boolean;
}

export function buildPracticePath(sessionId: string): string {
  return `/sessions/${sessionId}/practice`;
}

// @FollowsBlueprint core-view-intent
export function selectSessionPills(input: SessionPrimaryActionsInput): SessionPills {
  if (input.isLoading) return NO_PILLS;
  if (input.firstSetlistId === null) return { ...NO_PILLS, isAddSongsShown: true };
  const setlistPath = `/setlists/${input.firstSetlistId}`;
  if (!input.isPracticeModeOffered) return { ...NO_PILLS, setlistPath };
  return {
    ...NO_PILLS,
    practicePath: buildPracticePath(input.sessionId),
    setlistPath,
    setlistVariant: 'secondary',
  };
}
