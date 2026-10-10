import { NO_TIME_LEFT } from '@domain/round-clock.core';

const URGENT_BELOW_SECONDS = 10;

export function isCountdownUrgent(secondsRemaining: number): boolean {
  return secondsRemaining <= URGENT_BELOW_SECONDS;
}

export function isTimeUp(secondsRemaining: number): boolean {
  return secondsRemaining === NO_TIME_LEFT;
}
