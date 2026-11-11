import type { ParseKeys } from 'i18next';
import { selectClosenessNameKey } from '../../lib/closeness-name.core';
import type { ChipTone } from '../atoms/chip.variants';
import { CLOSENESS_LEVELS, type ClosenessLevel } from '../atoms/closeness-dot.variants';

export type BirthdayDayKey =
  | 'relations.birthday.today'
  | 'relations.birthday.tomorrow'
  | 'relations.birthday.in-days';

export type ClosenessLabelKey =
  | 'relations.closeness.named'
  | 'relations.closeness.unnamed'
  | 'relations.closeness.unscored';

export interface Closeness {
  readonly level: ClosenessLevel;
  readonly rank: number | null;
  readonly labelKey: ClosenessLabelKey;
  readonly nameKey: ParseKeys | null;
}

const [UNSCORED_LEVEL, ...SCORED_LEVELS] = CLOSENESS_LEVELS;
const LOWEST_RANK = 0;
const HIGHEST_RANK = SCORED_LEVELS.length - 1;
const TOMORROW = 1;
const SOON_DAYS = 3;
const NO_CLOSENESS: Closeness = {
  level: UNSCORED_LEVEL,
  rank: null,
  labelKey: 'relations.closeness.unscored',
  nameKey: null,
};

function selectScoredCloseness(rank: number): Closeness {
  const level = SCORED_LEVELS[Math.min(HIGHEST_RANK, Math.max(LOWEST_RANK, Math.round(rank)))];
  if (level === undefined) return NO_CLOSENESS;
  const nameKey = selectClosenessNameKey(rank);
  return {
    level,
    rank,
    labelKey: nameKey === null ? 'relations.closeness.unnamed' : 'relations.closeness.named',
    nameKey,
  };
}

// @FollowsBlueprint core-view-intent
export function selectCloseness(closeness: number | null): Closeness {
  return closeness === null ? NO_CLOSENESS : selectScoredCloseness(closeness);
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
