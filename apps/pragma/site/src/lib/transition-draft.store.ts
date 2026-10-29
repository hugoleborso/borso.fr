/** @Feature transitions */

import { createSheetDraftStore } from './sheet-draft.store';
import { buildTransitionDraftKey } from './transition-draft.utils';

const useTransitionTextDraft = createSheetDraftStore<string>();

export interface TransitionDraft {
  readonly text: string | null;
  readonly keep: (text: string) => void;
  readonly discard: () => void;
}

// @FollowsBlueprint hook-external-store
export function useTransitionDraft(songAId: string, songBId: string): TransitionDraft {
  const kept = useTransitionTextDraft(buildTransitionDraftKey(songAId, songBId));
  return { text: kept.draft, keep: kept.keep, discard: kept.discard };
}
