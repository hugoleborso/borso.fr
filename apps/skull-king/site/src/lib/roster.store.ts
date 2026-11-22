/** @DependsOnExternal browser-local-storage */

import { readRegulars, rememberRegulars, type RosterPlayer } from './roster.core';

const STORAGE_KEY = 'skull-king.regulars';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// @FollowsBlueprint persisted-store-module
export function loadRegulars(): readonly RosterPlayer[] {
  const storage = browserStorage();
  if (storage === null) return [];
  try {
    return readRegulars(storage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveRegulars(table: readonly RosterPlayer[]): void {
  const storage = browserStorage();
  if (storage === null) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(rememberRegulars(loadRegulars(), table)));
  } catch {
    return;
  }
}
