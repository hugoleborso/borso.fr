/** @Feature setlists */

import {
  useBreaksFollowingEntries,
  useDeleteSetlistBreak,
  useInsertSetlistBreak,
  useRenameSetlistBreak,
  useSetlistBreaks,
} from '../../lib/queries/setlist-breaks.queries';
import type { PlacedBreak } from './setlist-breaks.utils';

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
  return {
    listProps: {
      breaks: breaksQuery.data?.breaks ?? NO_BREAK,
      onAddBreakAfter: (afterEntryId) =>
        insertBreak.mutate({ setlistId, afterEntryId }, { onError: onFailure }),
      onRenameBreak: (breakId, label) =>
        renameBreak.mutate({ setlistId, breakId, label }, { onError: onFailure }),
      onRemoveBreak: (breakId) =>
        deleteBreak.mutate({ setlistId, breakId }, { onError: onFailure }),
    },
    withdrawSong: (songIndex, onRemoveFailed) =>
      following.withdrawSong(setlistId, songIndex, onRemoveFailed),
  };
}
