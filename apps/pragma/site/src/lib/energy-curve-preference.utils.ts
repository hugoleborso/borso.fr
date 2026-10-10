export const ENERGY_CURVE_STORAGE_KEY = 'pragma.setlist.energyCurve';
export const ENERGY_CURVE_HIDDEN = 'hidden';
export const ENERGY_CURVE_SHOWN = 'shown';

export interface PreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

// @FollowsBlueprint injected-storage-slice
export function isEnergyCurveShownIn(storage: PreferenceStorage): boolean {
  try {
    return storage.getItem(ENERGY_CURVE_STORAGE_KEY) !== ENERGY_CURVE_HIDDEN;
  } catch {
    return true;
  }
}

export function didStoreEnergyCurveChoice(storage: PreferenceStorage, isShown: boolean): boolean {
  try {
    storage.setItem(ENERGY_CURVE_STORAGE_KEY, isShown ? ENERGY_CURVE_SHOWN : ENERGY_CURVE_HIDDEN);
    return true;
  } catch {
    return false;
  }
}
