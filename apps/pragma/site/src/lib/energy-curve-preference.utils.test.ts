import { describe, expect, it } from 'vitest';
import {
  ENERGY_CURVE_HIDDEN,
  ENERGY_CURVE_SHOWN,
  ENERGY_CURVE_STORAGE_KEY,
  type PreferenceStorage,
  isEnergyCurveShownIn,
  didStoreEnergyCurveChoice,
} from './energy-curve-preference.utils';

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage & {
  store: Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value;
    },
  };
}

const BLOCKED_STORAGE: PreferenceStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

// @FollowsBlueprint test-pure-unit
describe('isEnergyCurveShownIn', () => {
  it('shows the curve when nothing is stored or the storage is blocked', () => {
    expect(isEnergyCurveShownIn(memoryStorage())).toBe(true);
    expect(isEnergyCurveShownIn(BLOCKED_STORAGE)).toBe(true);
  });

  it('hides the curve once the member hid it', () => {
    const storage = memoryStorage({ [ENERGY_CURVE_STORAGE_KEY]: ENERGY_CURVE_HIDDEN });
    expect(isEnergyCurveShownIn(storage)).toBe(false);
  });

  it('shows the curve once the member showed it again', () => {
    const storage = memoryStorage({ [ENERGY_CURVE_STORAGE_KEY]: ENERGY_CURVE_SHOWN });
    expect(isEnergyCurveShownIn(storage)).toBe(true);
  });
});

describe('didStoreEnergyCurveChoice', () => {
  it('stores the choice either way', () => {
    const storage = memoryStorage();
    expect(didStoreEnergyCurveChoice(storage, false)).toBe(true);
    expect(storage.store[ENERGY_CURVE_STORAGE_KEY]).toBe(ENERGY_CURVE_HIDDEN);
    expect(didStoreEnergyCurveChoice(storage, true)).toBe(true);
    expect(storage.store[ENERGY_CURVE_STORAGE_KEY]).toBe(ENERGY_CURVE_SHOWN);
  });

  it('reports nothing stored when the storage is blocked', () => {
    expect(didStoreEnergyCurveChoice(BLOCKED_STORAGE, false)).toBe(false);
  });
});
