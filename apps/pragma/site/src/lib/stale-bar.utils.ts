/**
 * Front-end mirror of `apps/pragma/api/src/bars/bars.core.ts`. Bars
 * arriving from the API carry `lastInteractionAt` as an ISO string;
 * the front-end's job is to render the stale-banner from the same
 * threshold. Spec use case 4.3 default = 60 days. Pure, `now` injected.
 */

export const STALE_BAR_DEFAULT_THRESHOLD_DAYS = 60;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BarStaleInput {
  readonly lastInteractionAt: string | null;
}

export function isStale(
  bar: BarStaleInput,
  now: Date,
  thresholdDays = STALE_BAR_DEFAULT_THRESHOLD_DAYS,
): boolean {
  if (bar.lastInteractionAt === null) return true;
  const lastTouchMs = new Date(bar.lastInteractionAt).getTime();
  if (Number.isNaN(lastTouchMs)) return true;
  const ageMs = now.getTime() - lastTouchMs;
  const ageDays = ageMs / MILLISECONDS_PER_DAY;
  return ageDays > thresholdDays;
}

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
