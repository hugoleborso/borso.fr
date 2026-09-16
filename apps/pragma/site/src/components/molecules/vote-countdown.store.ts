/** @Feature audience-voting */

const TICK_INTERVAL_MS = 1_000;
const SERVER_SNAPSHOT_TIME = 0;

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
export function subscribeVoteCountdown(listener: Listener): () => void {
  listeners.add(listener);
  currentTime = Date.now();
  ensureInterval();
  return () => {
    listeners.delete(listener);
    maybeStopInterval();
  };
}

export function getVoteCountdownTime(): number {
  return currentTime;
}

export function readVoteCountdownServerTime(): number {
  return SERVER_SNAPSHOT_TIME;
}
