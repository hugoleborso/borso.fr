const MILLISECONDS_PER_SECOND = 1_000;
export const NO_TIME_LEFT = 0;
const URGENT_BELOW_SECONDS = 10;

/**
 * @Blueprint core-countdown-from-two-instants
 * @BlueprintName Core Countdown From Two Instants
 * @BlueprintUsage Use for a deadline a screen has to show, where the start is a string the server sent and the present moment is whatever the component last rendered at.
 * @BlueprintDescription Takes the present moment as an argument rather than reading the clock, so the value a screen shows is a function of its inputs and a test can walk through the whole countdown without waiting. A round with no timer, or no round open at all, answers `null` rather than a number, which is what lets a component decide between rendering a clock and rendering nothing without a second question. The answer never goes below zero, because a deadline that passed is a deadline, not a negative amount of time.
 */
export function secondsLeft(
  roundOpenedAt: string | null,
  roundTimerSeconds: number | null,
  now: Date,
): number | null {
  if (roundTimerSeconds === null) return null;
  const openedAt = Date.parse(String(roundOpenedAt));
  if (Number.isNaN(openedAt)) return null;
  const elapsed = (now.getTime() - openedAt) / MILLISECONDS_PER_SECOND;
  return Math.max(Math.ceil(roundTimerSeconds - elapsed), NO_TIME_LEFT);
}

export function isCountdownUrgent(secondsRemaining: number): boolean {
  return secondsRemaining <= URGENT_BELOW_SECONDS;
}

export function isTimeUp(secondsRemaining: number): boolean {
  return secondsRemaining === NO_TIME_LEFT;
}
