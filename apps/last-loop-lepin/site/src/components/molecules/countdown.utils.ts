/**
 * Turns a remaining duration into the four digits the split flap counter
 * shows, plus the caption under them and the value a screen reader announces.
 *
 * Under one hour and forty minutes the counter reads minutes and seconds,
 * which keeps the left pair inside two digits. Beyond that it switches to
 * hours and minutes.
 */

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SWITCH_TO_HOURS_AT_SECONDS = 100 * SECONDS_PER_MINUTE;
const MAXIMUM_DISPLAYED_HOURS = 99;
const PAIR_DIGITS = 2;

export type CountdownFormat = 'MM:SS' | 'HH:MM';

export interface CountdownDisplay {
  readonly leftDigits: readonly string[];
  readonly rightDigits: readonly string[];
  readonly format: CountdownFormat;
  readonly accessibleValue: string;
}

function splitPair(value: number): readonly string[] {
  return `${value}`.padStart(PAIR_DIGITS, '0').split('');
}

function buildDisplay(left: number, right: number, format: CountdownFormat): CountdownDisplay {
  const leftDigits = splitPair(left);
  const rightDigits = splitPair(right);
  return {
    leftDigits,
    rightDigits,
    format,
    accessibleValue: `${leftDigits.join('')}:${rightDigits.join('')} ${format}`,
  };
}

// @FollowsBlueprint core-view-projection
export function projectCountdownDisplay(remainingMs: number): CountdownDisplay {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / MILLISECONDS_PER_SECOND));
  if (totalSeconds >= SWITCH_TO_HOURS_AT_SECONDS) {
    const hours = Math.min(MAXIMUM_DISPLAYED_HOURS, Math.floor(totalSeconds / SECONDS_PER_HOUR));
    const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return buildDisplay(hours, minutes, 'HH:MM');
  }
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return buildDisplay(minutes, seconds, 'MM:SS');
}
