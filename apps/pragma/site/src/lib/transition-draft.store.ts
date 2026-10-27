/** @Feature transitions */

import { useSyncExternalStore } from 'react';
import {
  buildTransitionDraftKey,
  clearTransitionDraft,
  putTransitionDraft,
  takeTransitionDraft,
  type TransitionDrafts,
} from './transition-draft.utils';

type Listener = () => void;

const listeners = new Set<Listener>();
const store: { drafts: TransitionDrafts } = { drafts: new Map() };

function publish(next: TransitionDrafts): void {
  store.drafts = next;
  for (const listener of listeners) listener();
}

function subscribeToTransitionDrafts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readTransitionDrafts(): TransitionDrafts {
  return store.drafts;
}

export interface TransitionDraft {
  readonly text: string | null;
  readonly keep: (text: string) => void;
  readonly discard: () => void;
}

// @FollowsBlueprint hook-external-store
export function useTransitionDraft(songAId: string, songBId: string): TransitionDraft {
  const drafts = useSyncExternalStore(
    subscribeToTransitionDrafts,
    readTransitionDrafts,
    readTransitionDrafts,
  );
  const key = buildTransitionDraftKey(songAId, songBId);
  return {
    text: takeTransitionDraft(drafts, key),
    keep: (text) => {
      publish(putTransitionDraft(store.drafts, key, text));
    },
    discard: () => {
      publish(clearTransitionDraft(store.drafts, key));
    },
  };
}
