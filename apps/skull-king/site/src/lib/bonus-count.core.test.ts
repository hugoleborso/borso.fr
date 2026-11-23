import { MAXIMUM_BONUS_COUNT, NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import { addBonus, hasBonus, isBonusFull, removeBonus } from './bonus-count.core';

const FULL_FOURTEENS = { ...NO_BONUS, standardFourteen: MAXIMUM_BONUS_COUNT.standardFourteen };

// @FollowsBlueprint test-pure-unit
describe('isBonusFull', () => {
  it('is full at the maximum count of the kind and not below it', () => {
    expect(isBonusFull(FULL_FOURTEENS, 'standardFourteen')).toBe(true);
    expect(isBonusFull({ ...NO_BONUS, standardFourteen: 2 }, 'standardFourteen')).toBe(false);
  });
});

describe('hasBonus', () => {
  it('holds a bonus from one card on', () => {
    expect(hasBonus(NO_BONUS, 'loot')).toBe(false);
    expect(hasBonus({ ...NO_BONUS, loot: 1 }, 'loot')).toBe(true);
  });
});

describe('addBonus', () => {
  it('adds one card of the kind it names', () => {
    expect(addBonus(NO_BONUS, 'pirateBySkullKing')).toEqual({
      ...NO_BONUS,
      pirateBySkullKing: 1,
    });
  });

  it('adds several colour 14s up to the maximum', () => {
    expect(addBonus({ ...NO_BONUS, standardFourteen: 2 }, 'standardFourteen')).toEqual(
      FULL_FOURTEENS,
    );
  });

  it('changes nothing at the maximum count', () => {
    expect(addBonus(FULL_FOURTEENS, 'standardFourteen')).toBe(FULL_FOURTEENS);
  });
});

describe('removeBonus', () => {
  it('removes one card of the kind it names', () => {
    expect(removeBonus(FULL_FOURTEENS, 'standardFourteen')).toEqual({
      ...NO_BONUS,
      standardFourteen: 2,
    });
  });

  it('changes nothing with no card of the kind', () => {
    expect(removeBonus(NO_BONUS, 'loot')).toBe(NO_BONUS);
  });
});
