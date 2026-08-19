/**
 * Pure helpers backing `CreateSessionDialog`. Kept side-effect-free so
 * the date defaulting + the `<input type="datetime-local">` ↔ ISO bridge
 * can be tested without mounting the form.
 * @Feature sessions
 */

const TOMORROW_HOUR = 20;
const TOMORROW_MINUTE = 0;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const ONE_DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const YEAR_DIGITS = 4;
const TWO_DIGIT_FIELD = 2;
const DATETIME_LOCAL_LENGTH = 16;

/**
 * Returns "tomorrow at 20:00 local time" formatted for an
 * `<input type="datetime-local">` value attribute (`YYYY-MM-DDTHH:mm`,
 * no timezone suffix). `now` is injected so the helper stays pure.
 */
export function defaultDateTimeLocal(now: Date): string {
  const tomorrow = new Date(now.getTime() + ONE_DAY_MS);
  tomorrow.setHours(TOMORROW_HOUR, TOMORROW_MINUTE, 0, 0);
  return formatDateTimeLocal(tomorrow);
}

/**
 * Format a `Date` as the value attribute expected by
 * `<input type="datetime-local">`. Uses the local timezone (no `Z`).
 */
// @FollowsBlueprint utils-pure-module
export function formatDateTimeLocal(date: Date): string {
  const year = String(date.getFullYear()).padStart(YEAR_DIGITS, '0');
  const month = String(date.getMonth() + 1).padStart(TWO_DIGIT_FIELD, '0');
  const day = String(date.getDate()).padStart(TWO_DIGIT_FIELD, '0');
  const hours = String(date.getHours()).padStart(TWO_DIGIT_FIELD, '0');
  const minutes = String(date.getMinutes()).padStart(TWO_DIGIT_FIELD, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a `<input type="datetime-local">` string (local time, no
 * timezone suffix) into an ISO-8601 datetime accepted by
 * `z.string().datetime()` on the back-end. Returns `null` if the input
 * is not a parseable local-datetime literal.
 */
export function dateTimeLocalToIso(value: string): string | null {
  if (value.length < DATETIME_LOCAL_LENGTH) return null;
  const candidate = new Date(value);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate.toISOString();
}

/**
 * Filter concerts to those happening strictly after `now`. Defensive
 * against unparseable dates (drops them) so the dropdown doesn't
 * surface garbage rows.
 */
export function filterFutureConcerts<T extends { date: string }>(
  concerts: readonly T[],
  now: Date,
): readonly T[] {
  const nowMs = now.getTime();
  return concerts.filter((concert) => new Date(concert.date).getTime() > nowMs);
}
