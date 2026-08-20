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

/**
 * @Blueprint hook-external-store
 * @BlueprintName Hook Over An External Store
 * @BlueprintUsage Use for reading a browser API into React, in place of an effect copying it into state.
 * @BlueprintDescription Subscribes through `useSyncExternalStore`, which stays correct during concurrent rendering where an effect does not, and declares subscribe, snapshot and server snapshot as module level functions so React receives the same three identities on every render and never resubscribes. The subscribe function returns the matching `removeEventListener` calls as its own cleanup.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToOnlineStatus, isBrowserOnline, isOnlineOnServer);
}
