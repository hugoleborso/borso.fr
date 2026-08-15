import { describe, expect, it } from 'vitest';
import {
  ENERGY_DEFAULT,
  isEnergyStored,
  selectEnergyAppearance,
} from './setlist-entry-energy.core';

// @FollowsBlueprint test-pure-unit
describe('isEnergyStored', () => {
  it('reads a freshly added entry as unset', () => {
    expect(isEnergyStored({ isEdited: false, entryEnergy: null, songEnergy: null })).toBe(false);
  });

  it('reads an entry energy as stored', () => {
    expect(isEnergyStored({ isEdited: false, entryEnergy: 7, songEnergy: null })).toBe(true);
  });

  it('reads the song energy as stored when the entry has none', () => {
    expect(isEnergyStored({ isEdited: false, entryEnergy: null, songEnergy: 3 })).toBe(true);
  });

  it('reads an edit in flight as stored', () => {
    expect(isEnergyStored({ isEdited: true, entryEnergy: null, songEnergy: null })).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectEnergyAppearance', () => {
  it('draws a stored energy in the accent palette', () => {
    expect(selectEnergyAppearance(true)).toEqual({
      sliderClassName: 'accent-accent',
      readoutClassName: 'text-ink-500',
    });
  });

  it('mutes both the slider and the number while nothing is stored', () => {
    expect(selectEnergyAppearance(false)).toEqual({
      sliderClassName: 'accent-line-strong opacity-60',
      readoutClassName: 'text-ink-300',
    });
  });
});

describe('ENERGY_DEFAULT', () => {
  it('is the midpoint the slider starts from', () => {
    expect(ENERGY_DEFAULT).toBe(5);
  });
});
