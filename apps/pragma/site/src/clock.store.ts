/**
 * Wall-clock external store. Components subscribe via `useSyncExternalStore`
 * so a clock read is a render input rather than a call made during render,
 * which is what keeps a component idempotent. The store owns its interval
 * lifecycle, so component code holds no `useEffect`.
 *
 * Mirrors `apps/last-loop-lepin/site/src/clock-store.ts`, which answers the
 * same question for that application; the two cannot share a module because
 * apps never import across app boundaries. The one deliberate difference is
 * the tick: last-loop-lepin drives a race countdown and ticks every second,
 * while everything here asks "has this concert started yet", which changes on
 * the minute. Ticking faster would re-render the whole shell sixty times as
 * often for an answer that cannot have changed.
 */

const TICK_INTERVAL_MS = 60_000;

type Listener = () => void;

const listeners = new Set<Listener>();
let currentTime: number = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  currentTime = Date.now();
  for (const listener of listeners) listener();
}

function ensureInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, TICK_INTERVAL_MS);
}

function maybeStopInterval(): void {
  if (!(intervalId !== null && listeners.size === 0)) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
}

// @FollowsBlueprint external-store-module
export function subscribeClock(listener: Listener): () => void {
  listeners.add(listener);
  ensureInterval();
  return () => {
    listeners.delete(listener);
    maybeStopInterval();
  };
}

export function getCurrentTime(): number {
  return currentTime;
}

/**
 * Snapshot for a server render. This application only renders in the browser,
 * so React never asks for it; it exists because `useSyncExternalStore` takes
 * the argument, and it has to be a stable value rather than a fresh clock read.
 */
export function readServerTime(): number {
  return 0;
}
