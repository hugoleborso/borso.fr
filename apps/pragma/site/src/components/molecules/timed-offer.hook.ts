import { useRef, useState } from 'react';

export interface TimedOffer<TValue> {
  readonly offered: TValue | null;
  readonly present: (value: TValue) => void;
  readonly withdraw: () => void;
}

/**
 * @Blueprint hook-timer-owned-by-handlers
 * @BlueprintName Hook Whose Timer Is Started And Cleared By Its Own Handlers
 * @BlueprintUsage Use for a timer that begins on one call and ends on another, where no effect is needed because nothing outside React starts it.
 * @BlueprintDescription Holds the pending timer in a ref, starts it in the handler that presents the value and clears it in every handler that ends the offer, so the timer has no lifecycle of its own to synchronise and no `useEffect`. Clearing before each start is what keeps a second presentation from being withdrawn by the first one's timer.
 */
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
