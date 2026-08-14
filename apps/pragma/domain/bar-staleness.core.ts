/**
 * When a bar counts as needing attention, for the spec's use case 4.3 banner:
 * "at login, surface bars with no interaction for more than N days".
 *
 * `lastInteractionAt` arrives as a `Date` from Drizzle and as an ISO string
 * from the API response, so the rule accepts both rather than being written
 * twice. An unparseable string counts as stale for the same reason `null`
 * does: nothing recorded means nothing to reassure the reader with.
 *
 * `now` is a parameter, so the rule never reads the clock.
 */

export const STALE_BAR_DEFAULT_THRESHOLD_DAYS = 60;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BarStaleInput {
  readonly lastInteractionAt: Date | string | null;
}

function readInteractionTime(lastInteractionAt: Date | string | null): number | null {
  if (lastInteractionAt === null) return null;
  const time =
    lastInteractionAt instanceof Date
      ? lastInteractionAt.getTime()
      : new Date(lastInteractionAt).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * A bar is stale when its last interaction is older than the threshold, and an
 * absent one counts as stale: the band never logged anything, which is what
 * the banner exists to remind them of.
 */
// @FollowsBlueprint core-decision
export function isStale(
  bar: BarStaleInput,
  now: Date,
  thresholdDays = STALE_BAR_DEFAULT_THRESHOLD_DAYS,
): boolean {
  const lastTouchMs = readInteractionTime(bar.lastInteractionAt);
  if (lastTouchMs === null) return true;
  const ageDays = (now.getTime() - lastTouchMs) / MILLISECONDS_PER_DAY;
  return ageDays > thresholdDays;
}

/** How many of the given bars are above the threshold, for the "N bars need attention" count. */
export function countStale(
  bars: readonly BarStaleInput[],
  now: Date,
  thresholdDays = STALE_BAR_DEFAULT_THRESHOLD_DAYS,
): number {
  let count = 0;
  for (const bar of bars) {
    if (isStale(bar, now, thresholdDays)) count += 1;
  }
  return count;
}
