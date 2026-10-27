import { describe, expect, it } from 'vitest';
import {
  ENERGY_DEFAULT,
  isEnergyStored,
  resolveEnergyLevel,
  selectEnergyAppearance,
  selectEnergyMeterAppearance,
} from './setlist-entry-energy.core';

// @FollowsBlueprint test-pure-unit
describe('isEnergyStored', () => {
  it('reads a freshly added entry as unset', () => {
    expect(isEnergyStored({ entryEnergy: null, songEnergy: null })).toBe(false);
  });

  it('reads an entry energy as stored', () => {
    expect(isEnergyStored({ entryEnergy: 7, songEnergy: null })).toBe(true);
  });

  it('reads the song energy as stored when the entry has none', () => {
    expect(isEnergyStored({ entryEnergy: null, songEnergy: 3 })).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('resolveEnergyLevel', () => {
  it('shows what the entry stores, which is what a refused write rolls back to', () => {
    expect(resolveEnergyLevel({ entryEnergy: 9, songEnergy: 3 })).toBe(9);
  });

  it('falls back to the song energy when the entry stores none', () => {
    expect(resolveEnergyLevel({ entryEnergy: null, songEnergy: 3 })).toBe(3);
  });

  it('falls back to the midpoint when neither is set', () => {
    expect(resolveEnergyLevel({ entryEnergy: null, songEnergy: null })).toBe(ENERGY_DEFAULT);
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectEnergyAppearance', () => {
  it('draws a stored energy in the accent palette', () => {
    expect(selectEnergyAppearance(true)).toEqual({
      filledClassName: 'bg-accent border-accent text-on-accent',
      emptyClassName: 'bg-sunk border-rule-strong text-ink-soft',
    });
  });

  it('mutes the filled segments while nothing is stored', () => {
    expect(selectEnergyAppearance(false)).toEqual({
      filledClassName: 'bg-ink-soft border-ink-soft text-leaf',
      emptyClassName: 'bg-sunk border-rule-strong text-ink-soft',
    });
  });
});

describe('selectEnergyMeterAppearance', () => {
  it('draws a stored energy in the accent palette, with no border or text class', () => {
    expect(selectEnergyMeterAppearance(true)).toEqual({
      filledClassName: 'bg-accent',
      emptyClassName: 'bg-rule-strong',
    });
  });

  it('mutes the bars while nothing is stored', () => {
    expect(selectEnergyMeterAppearance(false)).toEqual({
      filledClassName: 'bg-ink-soft',
      emptyClassName: 'bg-rule',
    });
  });
});

describe('ENERGY_DEFAULT', () => {
  it('is the midpoint the bar starts from', () => {
    expect(ENERGY_DEFAULT).toBe(5);
  });
});
