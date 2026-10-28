/** @Feature practice-mode */

import { useSyncExternalStore } from 'react';
import {
  forgetPracticePosition,
  readStoredPracticePosition,
  writePracticePosition,
} from './practice-position.adapter';

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

const NOTHING_STORED_ON_THE_SERVER = (): null => null;

export interface StoredPracticePositionHandle {
  readonly storedText: string | null;
  readonly save: (position: string) => void;
  readonly forget: () => void;
}

// @FollowsBlueprint hook-external-store
export function useStoredPracticePosition(sessionId: string): StoredPracticePositionHandle {
  const storedText = useSyncExternalStore(
    subscribe,
    () => readStoredPracticePosition(sessionId),
    NOTHING_STORED_ON_THE_SERVER,
  );
  return {
    storedText,
    save: (position) => {
      writePracticePosition(sessionId, position);
      notify();
    },
    forget: () => {
      forgetPracticePosition(sessionId);
      notify();
    },
  };
}
