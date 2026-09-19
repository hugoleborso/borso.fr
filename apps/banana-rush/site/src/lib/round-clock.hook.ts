import { useSyncExternalStore } from 'react';
import { secondsLeft } from './countdown.core';

const TICK_MS = 250;

function subscribeToTicks(onTick: () => void): () => void {
  const interval = setInterval(onTick, TICK_MS);
  return () => {
    clearInterval(interval);
  };
}

function readCoarseTick(): number {
  return Math.floor(Date.now() / TICK_MS);
}

/**
 * @Blueprint hook-clock-through-an-external-store
 * @BlueprintName Hook Reading The Clock Through An External Store
 * @BlueprintUsage Use for any value that changes as time passes, in place of an effect holding an interval beside a piece of state.
 * @BlueprintDescription Subscribes through `useSyncExternalStore`, which is what React offers for a value living outside the tree, so no component holds a timer in state and React owns the teardown rather than a cleanup somebody has to remember. The snapshot is the tick number rather than the timestamp, because the store compares snapshots by identity and a value changing every millisecond would re render on every comparison. The remaining seconds are then derived by a pure function, so the arithmetic is tested without waiting for a single real second to pass.
 */
export function useRoundClock(
  roundOpenedAt: string | null,
  roundTimerSeconds: number | null,
): number | null {
  const tick = useSyncExternalStore(subscribeToTicks, readCoarseTick, readCoarseTick);
  return secondsLeft(roundOpenedAt, roundTimerSeconds, new Date(tick * TICK_MS));
}
