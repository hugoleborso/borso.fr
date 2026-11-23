import { type BonusCounts, type BonusKind, MAXIMUM_BONUS_COUNT } from '@domain/scoring.core';

const NO_CARD = 0;
const ONE_CARD = 1;

// @FollowsBlueprint utils-pure-module
export function isBonusFull(bonuses: BonusCounts, kind: BonusKind): boolean {
  return bonuses[kind] >= MAXIMUM_BONUS_COUNT[kind];
}

export function hasBonus(bonuses: BonusCounts, kind: BonusKind): boolean {
  return bonuses[kind] > NO_CARD;
}

export function addBonus(bonuses: BonusCounts, kind: BonusKind): BonusCounts {
  if (isBonusFull(bonuses, kind)) return bonuses;
  return { ...bonuses, [kind]: bonuses[kind] + ONE_CARD };
}

export function removeBonus(bonuses: BonusCounts, kind: BonusKind): BonusCounts {
  if (!hasBonus(bonuses, kind)) return bonuses;
  return { ...bonuses, [kind]: bonuses[kind] - ONE_CARD };
}
