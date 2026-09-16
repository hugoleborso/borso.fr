/** @Feature audience-voting */

const MILLISECONDS_PER_SECOND = 1_000;
const NO_TIME_LEFT = 0;
const FULL_BAR_PERCENT = 100;

// @FollowsBlueprint utils-pure-module
export function secondsLeftUntil(closesAtEpochMs: number, nowEpochMs: number): number {
  const remaining = Math.max(NO_TIME_LEFT, closesAtEpochMs - nowEpochMs);
  return Math.ceil(remaining / MILLISECONDS_PER_SECOND);
}

export function selectCountdownFillPercent(secondsLeft: number, roundSeconds: number): number {
  const clamped = Math.min(Math.max(secondsLeft, NO_TIME_LEFT), roundSeconds);
  return Math.round((clamped / roundSeconds) * FULL_BAR_PERCENT);
}
