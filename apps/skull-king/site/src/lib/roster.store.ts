/** @DependsOnExternal browser-local-storage */

import type { PirateAvatar } from '@domain/pirate-avatar.core';
import { readLastPirate, readRegulars, rememberRegulars, type RosterPlayer } from './roster.core';

const STORAGE_KEY = 'skull-king.regulars';
const LAST_PIRATE_KEY = 'skull-king.last-pirate';

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

export function loadLastPirate(): PirateAvatar | null {
  const storage = browserStorage();
  if (storage === null) return null;
  try {
    return readLastPirate(storage.getItem(LAST_PIRATE_KEY));
  } catch {
    return null;
  }
}

export function saveLastPirate(avatar: PirateAvatar): void {
  const storage = browserStorage();
  if (storage === null) return;
  try {
    storage.setItem(LAST_PIRATE_KEY, JSON.stringify(avatar));
  } catch {
    return;
  }
}
