/** @DependsOnExternal browser-network-status */

import { useSyncExternalStore } from 'react';

const ONLINE_EVENT = 'online';
const OFFLINE_EVENT = 'offline';

function subscribeToOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener(ONLINE_EVENT, onStoreChange);
  window.addEventListener(OFFLINE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener(ONLINE_EVENT, onStoreChange);
    window.removeEventListener(OFFLINE_EVENT, onStoreChange);
  };
}

function isBrowserOnline(): boolean {
  return navigator.onLine;
}

function isOnlineOnServer(): boolean {
  return true;
}

// @FollowsBlueprint hook-external-store
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToOnlineStatus, isBrowserOnline, isOnlineOnServer);
}
