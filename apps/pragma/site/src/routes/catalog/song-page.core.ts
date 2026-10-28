/** @Feature songs */

import { instrumentsHeldBy, type Lineup } from '@domain/lineup.core';
import type { SongLineupRow } from './song-lineup.core';

export interface SetlistOfSong {
  readonly id: string;
  readonly name: string;
  readonly songIds: readonly string[];
}

export interface StudyQueueEntry {
  readonly songId: string;
  readonly instrumentId: string;
  readonly isStudiedToday: boolean;
}

export interface PractisedState {
  readonly instrumentIds: readonly string[];
  readonly isPractisedToday: boolean;
}

// @FollowsBlueprint core-view-projection
export function selectSetlistsOfSong<Setlist extends SetlistOfSong>(
  setlists: readonly Setlist[],
  songId: string,
): Setlist[] {
  return setlists.filter((setlist) => setlist.songIds.includes(songId));
}

export interface SetlistsLine {
  readonly messageKey: 'catalog.inNoSetlist' | 'catalog.inSetlists';
  readonly names: string;
}

const SETLIST_NAME_SEPARATOR = ', ';

export function describeSetlistsOfSong(
  setlists: readonly SetlistOfSong[],
  songId: string,
): SetlistsLine {
  const names = selectSetlistsOfSong(setlists, songId).map((setlist) => setlist.name);
  if (names.length === 0) return { messageKey: 'catalog.inNoSetlist', names: '' };
  return { messageKey: 'catalog.inSetlists', names: names.join(SETLIST_NAME_SEPARATOR) };
}

export function selectPractisedState(
  defaultLineup: Lineup,
  queue: readonly StudyQueueEntry[],
  songId: string,
  memberId: string | null,
): PractisedState {
  if (memberId === null) return { instrumentIds: [], isPractisedToday: false };
  const queueRows = queue.filter((row) => row.songId === songId);
  const instrumentIds = [
    ...new Set([
      ...instrumentsHeldBy(defaultLineup, memberId),
      ...queueRows.map((row) => row.instrumentId),
    ]),
  ];
  const isPractisedToday = queueRows.length > 0 && queueRows.every((row) => row.isStudiedToday);
  return { instrumentIds, isPractisedToday };
}

export function selectMemberLineupRow(
  rows: readonly SongLineupRow[],
  memberId: string | null,
): SongLineupRow | null {
  return rows.find((row) => row.memberId === memberId) ?? null;
}
