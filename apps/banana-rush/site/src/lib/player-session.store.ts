/** @DependsOnExternal browser-local-storage */

import { readSeats, type Seat, selectSeat, withSeat } from './player-session.core';

const STORAGE_KEY = 'banana-rush.seats';

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// @FollowsBlueprint persisted-store-module
export function loadSeat(joinCode: string): Seat | null {
  const storage = browserStorage();
  if (storage === null) return null;
  try {
    return selectSeat(readSeats(storage.getItem(STORAGE_KEY)), joinCode);
  } catch {
    return null;
  }
}

export function saveSeat(joinCode: string, seat: Seat): void {
  const storage = browserStorage();
  if (storage === null) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(withSeat(readSeats(storage.getItem(STORAGE_KEY)), joinCode, seat)),
    );
  } catch {
    return;
  }
}
