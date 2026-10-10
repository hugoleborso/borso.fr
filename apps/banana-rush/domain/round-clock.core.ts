const MILLISECONDS_PER_SECOND = 1_000;

export const NO_TIME_LEFT = 0;

function readInstantMilliseconds(instant: Date | string | null): number {
  if (instant === null) return Number.NaN;
  return new Date(instant).getTime();
}

/**
 * @Blueprint core-countdown-from-two-instants
 * @BlueprintName Core Countdown From Two Instants
 * @BlueprintUsage Use for a deadline a screen shows and a server enforces, where the start is a string a broadcast carried or a date the database returned, and the present moment is whatever the caller last read.
 * @BlueprintDescription Takes the present moment as an argument rather than reading the clock, so the value a screen shows is a function of its inputs and a test can walk through the whole countdown without waiting. A round with no timer, or no round open at all, answers `null` rather than a number, which is what lets a component decide between rendering a clock and rendering nothing without a second question. The answer never goes below zero, because a deadline that passed is a deadline, not a negative amount of time. The server asks whether the answer is zero, so the second the screen shows as up is the second the API accepts the round as over, and the two cannot disagree by a rounding.
 */
export function secondsLeftInRound(
  roundOpenedAt: Date | string | null,
  roundTimerSeconds: number | null,
  now: Date,
): number | null {
  if (roundTimerSeconds === null) return null;
  const openedAt = readInstantMilliseconds(roundOpenedAt);
  if (Number.isNaN(openedAt)) return null;
  const elapsed = (now.getTime() - openedAt) / MILLISECONDS_PER_SECOND;
  return Math.max(Math.ceil(roundTimerSeconds - elapsed), NO_TIME_LEFT);
}

export function hasRoundTimerExpired(
  roundOpenedAt: Date | string | null,
  roundTimerSeconds: number | null,
  now: Date,
): boolean {
  return secondsLeftInRound(roundOpenedAt, roundTimerSeconds, now) === NO_TIME_LEFT;
}
