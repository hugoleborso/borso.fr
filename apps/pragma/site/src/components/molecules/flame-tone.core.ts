import type { BandFlame } from '@domain/practice-flame.core';
import type { FlameTone } from '../atoms/flame-mark.utils';

const FLAME_STATUS_KEY = {
  out: 'streaks.noFlame',
  counted: 'streaks.todayCounted',
  open: 'streaks.todayOpen',
} as const;

export type FlameStatusKey = (typeof FLAME_STATUS_KEY)[FlameTone];

const NO_DAYS = 0;

// @FollowsBlueprint core-marker-read-off-an-existing-field
export function selectFlameTone(flame: BandFlame): FlameTone {
  if (flame.days === NO_DAYS) return 'out';
  return flame.isTodayCounted ? 'counted' : 'open';
}

export function selectFlameStatusKey(flame: BandFlame): FlameStatusKey {
  return FLAME_STATUS_KEY[selectFlameTone(flame)];
}

export function selectTodayStatusKey(
  flame: BandFlame,
): 'streaks.todayCounted' | 'streaks.todayOpen' {
  return flame.isTodayCounted ? FLAME_STATUS_KEY.counted : FLAME_STATUS_KEY.open;
}
