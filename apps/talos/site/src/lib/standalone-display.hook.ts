/** @DependsOnExternal browser-display-mode */

import { useSyncExternalStore } from 'react';

const STANDALONE_QUERY = '(display-mode: standalone)';

function subscribeToDisplayMode(onStoreChange: () => void): () => void {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener('change', onStoreChange);
  return () => {
    query.removeEventListener('change', onStoreChange);
  };
}

function isDisplayedStandalone(): boolean {
  const isIosHomeScreenApp = 'standalone' in navigator && navigator.standalone === true;
  return isIosHomeScreenApp || window.matchMedia(STANDALONE_QUERY).matches;
}

function isStandaloneOnServer(): boolean {
  return true;
}

// @FollowsBlueprint hook-external-store
export function useIsDisplayedStandalone(): boolean {
  return useSyncExternalStore(subscribeToDisplayMode, isDisplayedStandalone, isStandaloneOnServer);
}
