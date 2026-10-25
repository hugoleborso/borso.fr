/** @Feature takes */

const TICK_INTERVAL_MILLISECONDS = 1_000;

type Listener = () => void;

const listeners = new Set<Listener>();
let currentTime: number = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  currentTime = Date.now();
  for (const listener of listeners) listener();
}

// @FollowsBlueprint external-store-module
export function subscribeSecondClock(listener: Listener): () => void {
  listeners.add(listener);
  if (intervalId === null) {
    currentTime = Date.now();
    intervalId = setInterval(tick, TICK_INTERVAL_MILLISECONDS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || intervalId === null) return;
    clearInterval(intervalId);
    intervalId = null;
  };
}

export function readSecondClock(): number {
  return currentTime;
}

export function readServerSecondClock(): number {
  return 0;
}
