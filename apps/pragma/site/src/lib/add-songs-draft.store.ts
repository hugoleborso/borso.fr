/** @Feature setlists */

import { createSheetDraftStore } from './sheet-draft.store';

const usePickedSongsDraft = createSheetDraftStore<readonly string[]>();

const NO_PICK: readonly string[] = [];

export interface AddSongsDraft {
  readonly pickedSongIds: readonly string[];
  readonly revise: (change: (pickedSongIds: readonly string[]) => readonly string[]) => void;
  readonly discard: () => void;
}

// @FollowsBlueprint hook-external-store
export function useAddSongsDraft(setlistId: string): AddSongsDraft {
  const kept = usePickedSongsDraft(setlistId);
  return {
    pickedSongIds: kept.draft ?? NO_PICK,
    revise: (change) => kept.revise((picked) => change(picked ?? NO_PICK)),
    discard: kept.discard,
  };
}
