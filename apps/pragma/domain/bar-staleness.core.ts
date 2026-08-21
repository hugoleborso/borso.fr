export const STALE_BAR_DEFAULT_THRESHOLD_DAYS = 60;

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

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
