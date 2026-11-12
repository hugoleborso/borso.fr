/** @DependsOnExternal browser-session-storage */

import { type DockTargetBox, shouldPlayOpening, type ViewportSize } from './opening.core';

const PLAYED_KEY = 'talos.opening-played';
const PLAYED_VALUE = '1';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DOCK_TARGET_SELECTOR = '[data-opening-dock]';
const HIDDEN = 'hidden';

export interface OpeningStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const UNAVAILABLE_STORAGE: OpeningStorage = {
  getItem: () => null,
  setItem: () => undefined,
};

// @FollowsBlueprint injected-storage-slice
export function readSessionStorage(): OpeningStorage {
  try {
    return window.sessionStorage;
  } catch {
    return UNAVAILABLE_STORAGE;
  }
}

export function hasOpeningPlayed(storage: OpeningStorage): boolean {
  return storage.getItem(PLAYED_KEY) === PLAYED_VALUE;
}

export function didRecordOpening(storage: OpeningStorage): boolean {
  try {
    storage.setItem(PLAYED_KEY, PLAYED_VALUE);
    return true;
  } catch {
    return false;
  }
}

export function shouldOpenThisLoad(storage: OpeningStorage, isMotionReducedNow: boolean): boolean {
  const hasPlayed = hasOpeningPlayed(storage);
  didRecordOpening(storage);
  return shouldPlayOpening(hasPlayed, isMotionReducedNow);
}

export function isMotionReduced(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function readViewport(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

function findDockTarget(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DOCK_TARGET_SELECTOR);
}

export function measureDockTarget(): DockTargetBox | null {
  const target = findDockTarget();
  if (target === null) return null;
  const { left, top, width, height } = target.getBoundingClientRect();
  return { left, top, width, height };
}

export function setDockTargetHidden(isHidden: boolean): void {
  const target = findDockTarget();
  if (target === null) return;
  target.style.visibility = isHidden ? HIDDEN : '';
}
