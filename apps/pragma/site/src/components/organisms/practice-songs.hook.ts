/** @Feature sessions */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSavePracticeSongs } from '../../lib/queries/practice-songs.queries';
import { useEntriesOfSetlists } from '../../lib/queries/setlist-entries.queries';
import { type LabelledSession, useSessionLabel } from '../../lib/session-label.hook';
import {
  listPracticeSongIds,
  type PooledSetlist,
  type PracticeSongsEntry,
  planPracticeSongsSave,
} from '../../routes/sessions/practice-songs.core';
import { buildOrderAddressFromSession } from '../../routes/setlists/setlist-order.core';
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

export interface OrderPracticeSongs {
  readonly order: () => void;
  readonly isPending: boolean;
  readonly failure: string | null;
}

export function useOrderPracticeSongs(
  practice: LabelledSession & { readonly id: string },
  practiceSetlists: readonly PooledSetlist[],
  practiceSongs: Pick<PracticeSongs<PracticeListedSong>, 'entriesBySetlistId' | 'songIds'>,
): OrderPracticeSongs {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const labelOf = useSessionLabel();
  const saveSongs = useSavePracticeSongs();
  const order = (): void => {
    saveSongs.mutate(
      {
        practiceId: practice.id,
        setlistName: labelOf(practice),
        plan: planPracticeSongsSave({
          practiceId: practice.id,
          practiceSetlists,
          entriesBySetlistId: practiceSongs.entriesBySetlistId,
          tickedSongIds: practiceSongs.songIds,
        }),
      },
      {
        onSuccess: (ownSetlistId) => {
          if (ownSetlistId !== null) {
            navigateTo(buildOrderAddressFromSession(ownSetlistId, practice.id));
          }
        },
      },
    );
  };
  return {
    order,
    isPending: saveSongs.isPending,
    failure: saveSongs.isError ? t('sessions.practiceSongs.failure') : null,
  };
}
