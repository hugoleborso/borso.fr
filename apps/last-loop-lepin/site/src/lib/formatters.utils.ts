/**
 * Every number, date, and duration the interface shows is formatted here.
 *
 * Each function takes the locale it should format in, so none of them reads
 * the environment and all of them are testable by calling with values.
 */

const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const METRES_PER_KILOMETRE = 1_000;
const BYTES_PER_KILOBYTE = 1_024;
const DISTANCE_DECIMALS = 2;
const FILE_SIZE_DECIMALS = 1;
const TWO_DIGITS = 2;
const PERCENT_SCALE = 100;
const EMPTY_VALUE = '—';

function padTwoDigits(value: number): string {
  return `${value}`.padStart(TWO_DIGITS, '0');
}

/** Wall clock hour and minute of an instant, in the browser's time zone. */
export function formatHourMinute(instant: Date): string {
  return `${padTwoDigits(instant.getHours())}:${padTwoDigits(instant.getMinutes())}`;
}

/** Long form race date, e.g. `13 juin 2026` in French. */
export function formatRaceDate(instant: Date, locale: string): string {
  return instant.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Wall clock time down to the second, used on the leaderboard chips. */
export function formatClockTime(instant: Date, locale: string): string {
  return instant.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTimeOfDay(instant: Date, locale: string): string {
  return instant.toLocaleTimeString(locale);
}

/** `MM:SS`, or an em dash for a negative duration the race cannot produce. */
export function formatLoopDuration(durationMs: number): string {
  if (durationMs < 0) return EMPTY_VALUE;
  const totalSeconds = Math.floor(durationMs / MILLISECONDS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;
}

/** Pace shown on a punch tile, e.g. `58'12"`, or an em dash when unknown. */
export function formatPace(durationMs: number | null): string {
  const paceMs = durationMs ?? 0;
  if (paceMs <= 0) return EMPTY_VALUE;
  const totalSeconds = Math.floor(paceMs / MILLISECONDS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}'${padTwoDigits(seconds)}"`;
}

export function formatKilometres(distanceMetres: number): string {
  return (distanceMetres / METRES_PER_KILOMETRE).toFixed(DISTANCE_DECIMALS);
}

export function formatElevationMetres(elevationMetres: number): string {
  return `${Math.round(elevationMetres)}`;
}

export function formatKilobytes(sizeBytes: number): string {
  return (sizeBytes / BYTES_PER_KILOBYTE).toFixed(FILE_SIZE_DECIMALS);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * PERCENT_SCALE)}`;
}

/** Bib number as it appears on a punch tile, e.g. `007`, or an em dash. */
export function formatBibNumber(bib: number | null, digits: number): string {
  if (bib === null) return EMPTY_VALUE;
  return `${bib}`.padStart(digits, '0');
}

export function formatLoopIndex(loopIndex: number): string {
  return padTwoDigits(loopIndex);
}
