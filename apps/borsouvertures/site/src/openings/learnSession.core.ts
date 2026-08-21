import { findOpening, findVariation, type Selection } from './selectors.utils';
import type { Opening, Variation } from './types';

export interface LearnDrillTarget {
  opening: Opening;
  variation: Variation;
}

const NO_VARIATION_ID = '';

const NO_OPENING: Opening = { id: '', name: '', ecoCodes: [], variations: [] };
const NO_VARIATION: Variation = { id: NO_VARIATION_ID, name: '', lines: [] };

export const NO_DRILL_TARGET: LearnDrillTarget = {
  opening: NO_OPENING,
  variation: NO_VARIATION,
};

// @FollowsBlueprint core-view-intent
export function findLearnDrillTarget(openings: Opening[], selection: Selection): LearnDrillTarget {
  const opening = findOpening(openings, selection.openingId);
  if (opening === undefined) return NO_DRILL_TARGET;
  const variation = findVariation(opening, selection.variationId);
  if (variation === undefined) return NO_DRILL_TARGET;
  return { opening, variation };
}

export function isLearnDrillReady(target: LearnDrillTarget): boolean {
  return target.variation.id !== NO_VARIATION_ID;
}
