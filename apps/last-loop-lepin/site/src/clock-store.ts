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
  if (intervalId !== null && listeners.size === 0) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

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
