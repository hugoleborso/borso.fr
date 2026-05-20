/**
 * Pure rules for the bars bounded context. `isStale` answers the
 * spec's use case 4.3 banner ("at login, surface bars with no
 * interaction for >N days"). `now` is injected — the function never
 * calls `new Date()` so tests can lock the clock with
 * `vi.setSystemTime` indirectly by passing a fixed `now`.
 */

export const STALE_BAR_DEFAULT_THRESHOLD_DAYS = 60;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BarStaleInput {
  readonly lastInteractionAt: Date | null;
}

/**
 * A bar is stale when its `lastInteractionAt` is older than the
 * threshold. A null `lastInteractionAt` counts as stale (the band
 * never logged any interaction; the banner should remind them to).
 */
export function isStale(
  bar: BarStaleInput,
  now: Date,
  thresholdDays = STALE_BAR_DEFAULT_THRESHOLD_DAYS,
): boolean {
  if (bar.lastInteractionAt === null) return true;
  const ageMs = now.getTime() - bar.lastInteractionAt.getTime();
  const ageDays = ageMs / MILLISECONDS_PER_DAY;
  return ageDays > thresholdDays;
}

/**
 * Counts bars currently above the staleness threshold. Used by the
 * /bars list view + login banner to display "N bars need attention".
 */
export function countStale<T extends BarStaleInput>(
  bars: readonly T[],
  now: Date,
  thresholdDays = STALE_BAR_DEFAULT_THRESHOLD_DAYS,
): number {
  let count = 0;
  for (const bar of bars) {
    if (isStale(bar, now, thresholdDays)) count += 1;
  }
  return count;
}
