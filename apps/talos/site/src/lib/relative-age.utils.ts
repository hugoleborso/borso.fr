export type AgeUnit = 'minutes' | 'hours' | 'days';

export interface Age {
  readonly unit: AgeUnit;
  readonly value: number;
}

const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_SHOWN_BEFORE_DAYS = 48;
const HOURS_PER_DAY = 24;

// @FollowsBlueprint utils-formatter
export function measureAge(fromInstant: string, nowMilliseconds: number): Age | null {
  const from = Date.parse(fromInstant);
  if (Number.isNaN(from)) return null;
  const minutes = Math.max(0, Math.floor((nowMilliseconds - from) / MILLISECONDS_PER_MINUTE));
  if (minutes < MINUTES_PER_HOUR) return { unit: 'minutes', value: minutes };
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_SHOWN_BEFORE_DAYS) return { unit: 'hours', value: hours };
  return { unit: 'days', value: Math.floor(hours / HOURS_PER_DAY) };
}
