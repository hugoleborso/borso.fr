import { useRef, useState } from 'react';
import {
  buildLatestTextSaveState,
  type LatestTextSaveEvent,
  type LatestTextSaveState,
  type LatestTextSaveStatus,
  planNextSave,
  reduceLatestTextSave,
  selectLatestTextSaveStatus,
} from './latest-text-save.utils';

export const TEXT_SAVE_PAUSE_MS = 600;

export interface LatestTextSave {
  readonly type: (text: string) => void;
  readonly flush: () => void;
  readonly status: LatestTextSaveStatus;
}

export interface LatestTextSaveOptions {
  readonly savedText: string;
  readonly save: (text: string) => Promise<unknown>;
  readonly pauseMs?: number;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useLatestTextSave(options: LatestTextSaveOptions): LatestTextSave {
  const state = useRef<LatestTextSaveState>(buildLatestTextSaveState(options.savedText));
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<LatestTextSaveStatus>('saved');

  const apply = (event: LatestTextSaveEvent): void => {
    state.current = reduceLatestTextSave(state.current, event);
    setStatus(selectLatestTextSaveStatus(state.current));
  };

  const clearPending = (): void => {
    if (pendingTimer.current === null) return;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
  };

  const sendLatest = (): void => {
    const text = planNextSave(state.current);
    if (text === null) return;
    apply({ kind: 'saveStarted', text });
    options.save(text).then(
      () => {
        apply({ kind: 'saveSucceeded' });
        sendLatest();
      },
      () => {
        apply({ kind: 'saveFailed' });
      },
    );
  };

  return {
    type: (text) => {
      apply({ kind: 'typed', text });
      clearPending();
      pendingTimer.current = setTimeout(() => {
        pendingTimer.current = null;
        sendLatest();
      }, options.pauseMs ?? TEXT_SAVE_PAUSE_MS);
    },
    flush: () => {
      clearPending();
      sendLatest();
    },
    status,
  };
}
