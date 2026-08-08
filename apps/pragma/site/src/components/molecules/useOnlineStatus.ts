/**
 * `useIsOnline()` mirrors `navigator.onLine` into the React tree
 * through `useSyncExternalStore`, so the read stays correct under
 * concurrent rendering and no effect copies the browser's value into
 * state.
 *
 * `subscribe` and `getSnapshot` are module-level constants, so React
 * receives the same identities on every render and never resubscribes.
 */

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

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToOnlineStatus, isBrowserOnline, isOnlineOnServer);
}
