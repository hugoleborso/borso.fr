/** @Feature setlists */

import { useQueryClient } from '@tanstack/react-query';
import { useReorderSetlist } from '../../lib/queries/setlist-entries.queries';
import { setlistKeys } from '../../lib/queries/setlists.queries';
import type { EntriesCache } from '../../lib/queries/setlists.utils';
import {
  useBreaksFollowingEntries,
  useDeleteSetlistBreak,
  useInsertSetlistBreak,
  useRenameSetlistBreak,
  useSetlistBreaks,
} from '../../lib/queries/setlist-breaks.queries';
import { listItemIds, type PlacedBreak } from './setlist-breaks.core';

const NO_BREAK: readonly PlacedBreak[] = [];

export interface SetlistBreakListProps {
  readonly breaks: readonly PlacedBreak[];
  readonly onAddBreakAfter: (afterEntryId: string) => void;
  readonly onRenameBreak: (breakId: string, label: string) => void;
  readonly onRemoveBreak: (breakId: string) => void;
}

export interface SetlistBreakActions {
  readonly listProps: SetlistBreakListProps;
  readonly withdrawSong: (songIndex: number, onFailure: () => void) => () => void;
  readonly rememberPlacement: () => () => void;
}

export function useSetlistBreakActions(
  setlistId: string,
  onFailure: () => void,
): SetlistBreakActions {
  const breaksQuery = useSetlistBreaks(setlistId);
  const insertBreak = useInsertSetlistBreak();
  const renameBreak = useRenameSetlistBreak();
  const deleteBreak = useDeleteSetlistBreak();
  const following = useBreaksFollowingEntries();
  const queryClient = useQueryClient();
  const reorder = useReorderSetlist();
  const breaks = breaksQuery.data?.breaks ?? NO_BREAK;
  const putBreaksBackTo = (placed: readonly PlacedBreak[]) => (): void => {
    if (placed.length === 0) return;
    const cached = queryClient.getQueryData<EntriesCache>(setlistKeys.entriesOf(setlistId));
    const entryIds = (cached?.entries ?? []).map((entry) => entry.id);
    const orderedIds = listItemIds(entryIds, placed);
    const failReorder = following.followReorder(setlistId, orderedIds, onFailure);
    reorder.mutate({ setlistId, entryIds: orderedIds }, { onError: failReorder });
  };
  return {
    listProps: {
      breaks,
      onAddBreakAfter: (afterEntryId) =>
        insertBreak.mutate({ setlistId, afterEntryId }, { onError: onFailure }),
      onRenameBreak: (breakId, label) =>
        renameBreak.mutate({ setlistId, breakId, label }, { onError: onFailure }),
      onRemoveBreak: (breakId) =>
        deleteBreak.mutate({ setlistId, breakId }, { onError: onFailure }),
    },
    withdrawSong: (songIndex, onRemoveFailed) =>
      following.withdrawSong(setlistId, songIndex, onRemoveFailed),
    rememberPlacement: () => putBreaksBackTo(breaks),
  };
}
