import { describe, expect, it } from 'vitest';
import {
  arrangeByIds,
  averageEnergy,
  buildEnergyBars,
  ENERGY_METER_STEPS,
  projectOrder,
  selectEnergyBarClass,
  selectMeterStep,
} from './energy-curve.utils';

// @FollowsBlueprint test-pure-unit
describe('buildEnergyBars', () => {
  it('reads the entry energy first, then the song energy, then the default level unstored', () => {
    const bars = buildEnergyBars([
      { id: 'a', entryEnergy: 8, songEnergy: 3 },
      { id: 'b', entryEnergy: null, songEnergy: 4 },
      { id: 'c', entryEnergy: null, songEnergy: null },
    ]);
    expect(bars).toEqual([
      { id: 'a', level: 8, isStored: true, heightRatio: 0.8 },
      { id: 'b', level: 4, isStored: true, heightRatio: 0.4 },
      { id: 'c', level: 5, isStored: false, heightRatio: 0.5 },
    ]);
  });
});

describe('averageEnergy', () => {
  it('rounds the mean level to one decimal, and has none for an empty setlist', () => {
    const bars = buildEnergyBars([
      { id: 'a', entryEnergy: 7, songEnergy: null },
      { id: 'b', entryEnergy: 6, songEnergy: null },
      { id: 'c', entryEnergy: 6, songEnergy: null },
    ]);
    expect(averageEnergy(bars)).toBe(6.3);
    expect(averageEnergy([])).toBeNull();
  });
});

describe('selectMeterStep', () => {
  it('spreads the ten levels over five steps, two levels each', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(selectMeterStep)).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });
});

describe('projectOrder', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves the lifted row to the place of the row it is over, downwards and upwards', () => {
    expect(projectOrder(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(projectOrder(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('keeps the order when the row is over itself, over nothing or not in the list', () => {
    expect(projectOrder(ids, 'b', 'b')).toEqual(ids);
    expect(projectOrder(ids, 'b', null)).toEqual(ids);
    expect(projectOrder(ids, 'z', 'b')).toEqual(ids);
    expect(projectOrder(ids, 'b', 'z')).toEqual(ids);
  });
});

describe('arrangeByIds', () => {
  it('returns the items in the order of the ids, skipping an id with no item', () => {
    const songRows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(arrangeByIds(songRows, ['c', 'x', 'a', 'b']).map((row) => row.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
});

describe('ENERGY_METER_STEPS', () => {
  it('lists the five steps of the meter', () => {
    expect(ENERGY_METER_STEPS).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('selectEnergyBarClass', () => {
  const stored = { id: 'a', level: 7, isStored: true, heightRatio: 0.7 };
  const unset = { id: 'b', level: 5, isStored: false, heightRatio: 0.5 };

  it('draws the lifted bar in the action blue, a stored one in ink and an unset one muted', () => {
    expect(selectEnergyBarClass(stored, 'a')).toBe('bg-accent');
    expect(selectEnergyBarClass(stored, 'b')).toBe('bg-ink-soft');
    expect(selectEnergyBarClass(unset, null)).toBe('bg-rule-strong');
  });
});
