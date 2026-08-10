/**
 * Wall-clock external store. Components subscribe via `useSyncExternalStore`
 * to re-render on each tick. The store owns its interval lifecycle (no
 * `useEffect` in component code).
 */

const TICK_INTERVAL_MS = 1_000;

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

/**
 * @Blueprint external-store-module
 * @BlueprintName External Store Module
 * @BlueprintUsage Use for state that lives outside React and that components read with `useSyncExternalStore`.
 * @BlueprintDescription Exports the three arguments `useSyncExternalStore` takes as module level functions, so a component never passes a fresh closure and never resubscribes on a render. The store owns its own interval: `subscribeClock` starts it on the first listener and the returned unsubscribe stops it once the listener set empties, which is the lifecycle a component would otherwise write as an effect. `readServerTime` returns a fixed value rather than reading the clock, because a server snapshot has to be stable.
 */
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
