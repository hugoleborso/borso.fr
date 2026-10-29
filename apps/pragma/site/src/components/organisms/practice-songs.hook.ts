/** @Feature sessions */

import { useMemo } from 'react';
import { useEntriesOfSetlists } from '../../lib/queries/setlist-entries.queries';
import {
  listPracticeSongIds,
  type PracticeSongsEntry,
} from '../../routes/sessions/practice-songs.core';
import type { PracticeListedSong } from './PracticeSongList';

const NO_SETLIST_IDS: readonly string[] = [];

export interface PracticeSongs<TSong extends PracticeListedSong> {
  readonly entriesBySetlistId: Readonly<Record<string, readonly PracticeSongsEntry[]>>;
  readonly isLoading: boolean;
  readonly songsById: Readonly<Record<string, TSong>>;
  readonly songIds: readonly string[];
  readonly songs: readonly TSong[];
}

export function usePracticeSongs<TSong extends PracticeListedSong>(
  isPractice: boolean,
  setlists: readonly { readonly id: string }[],
  songs: readonly TSong[],
): PracticeSongs<TSong> {
  const practiceEntries = useEntriesOfSetlists(
    isPractice ? setlists.map((setlist) => setlist.id) : NO_SETLIST_IDS,
  );
  const songsById = useMemo(
    () => Object.fromEntries(songs.map((song) => [song.id, song])),
    [songs],
  );
  const songIds = listPracticeSongIds(setlists, practiceEntries.entriesBySetlistId);
  return {
    entriesBySetlistId: practiceEntries.entriesBySetlistId,
    isLoading: practiceEntries.isLoading,
    songsById,
    songIds,
    songs: songIds.flatMap((songId) => songsById[songId] ?? []),
  };
}
