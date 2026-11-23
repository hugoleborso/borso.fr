import type { BandFlame } from '@domain/practice-flame.core';
import type { FlameTone } from '../atoms/flame-mark.utils';

const NO_DAYS = 0;

// @FollowsBlueprint core-marker-read-off-an-existing-field
export function selectFlameTone(flame: BandFlame): FlameTone {
  if (flame.days === NO_DAYS) return 'out';
  return flame.isTodayCounted ? 'counted' : 'open';
}
