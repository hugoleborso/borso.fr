/** @Feature songs */

const SECONDS_PER_MINUTE = 60;
const SECONDS_LABEL_PAD = 2;

// @FollowsBlueprint utils-formatter
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(SECONDS_LABEL_PAD, '0')}`;
}

const MINUTES_PER_HOUR = 60;
const MINUTE_LABEL_PAD = 2;

export function sumKnownDurations(
  durationsInSeconds: readonly (number | null | undefined)[],
): number | null {
  const known = durationsInSeconds.filter((duration) => typeof duration === 'number');
  if (known.length === 0) return null;
  return known.reduce((total, duration) => total + duration, 0);
}

export interface TotalDurationLabel {
  readonly kind: 'hoursMinutes' | 'minutes';
  readonly hours: number;
  readonly minutes: string;
}

export function describeTotalDuration(totalSeconds: number): TotalDurationLabel {
  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return { kind: 'minutes', hours, minutes: String(minutes) };
  return { kind: 'hoursMinutes', hours, minutes: String(minutes).padStart(MINUTE_LABEL_PAD, '0') };
}
