import { useRef, useState } from 'react';

export interface TimedOffer<TValue> {
  readonly offered: TValue | null;
  readonly present: (value: TValue) => void;
  readonly withdraw: () => void;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useTimedOffer<TValue>(durationMs: number): TimedOffer<TValue> {
  const [offered, setOffered] = useState<TValue | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = (): void => {
    if (pendingTimer.current === null) return;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
  };

  return {
    offered,
    present: (value) => {
      clearPending();
      setOffered(value);
      pendingTimer.current = setTimeout(() => {
        pendingTimer.current = null;
        setOffered(null);
      }, durationMs);
    },
    withdraw: () => {
      clearPending();
      setOffered(null);
    },
  };
}
