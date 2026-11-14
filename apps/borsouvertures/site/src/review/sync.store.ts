import { useSyncExternalStore } from 'react';
import type { SyncStatus } from './sync.core';

const store: { status: SyncStatus } = { status: 'idle' };
const listeners = new Set<() => void>();

function subscribeToSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readSyncStatus(): SyncStatus {
  return store.status;
}

export function replaceSyncStatus(status: SyncStatus): void {
  store.status = status;
  for (const listener of listeners) listener();
}

// @FollowsBlueprint external-store-module
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeToSyncStatus, readSyncStatus);
}
