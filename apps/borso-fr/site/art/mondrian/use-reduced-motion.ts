import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CHANGE_EVENT = 'change';

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    mediaQuery.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function isReducedMotionRequested(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function isReducedMotionRequestedOnServer(): boolean {
  return false;
}

export function useIsReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    isReducedMotionRequested,
    isReducedMotionRequestedOnServer,
  );
}
