import type { ChipTone } from '../atoms/chip.variants';
import { CLOSENESS_LEVELS, type ClosenessLevel } from '../atoms/closeness-dot.variants';

export type BirthdayDayKey =
  'relations.birthday.today' | 'relations.birthday.tomorrow' | 'relations.birthday.in-days';

export interface Closeness {
  readonly level: ClosenessLevel;
  readonly rank: number;
}

const LOWEST_RANK = 0;
const HIGHEST_RANK = CLOSENESS_LEVELS.length - 1;
const TOMORROW = 1;
const SOON_DAYS = 3;
const NO_CLOSENESS: Closeness = { level: 'none', rank: LOWEST_RANK };

// @FollowsBlueprint core-view-intent
export function selectCloseness(closeness: number | null): Closeness {
  const rank = Math.min(HIGHEST_RANK, Math.max(LOWEST_RANK, Math.round(closeness ?? LOWEST_RANK)));
  const level = CLOSENESS_LEVELS[rank];
  return level === undefined ? NO_CLOSENESS : { level, rank };
}

export function selectBirthdayDayKey(daysUntil: number): BirthdayDayKey {
  if (daysUntil <= 0) return 'relations.birthday.today';
  if (daysUntil === TOMORROW) return 'relations.birthday.tomorrow';
  return 'relations.birthday.in-days';
}

export function selectBirthdayTone(daysUntil: number): ChipTone {
  if (daysUntil <= 0) return 'bronze';
  return daysUntil <= SOON_DAYS ? 'warning' : 'neutral';
}
