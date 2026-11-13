export const SYNC_CURSOR_STORAGE_KEY = 'borsouvertures.sync-cursor';
export const DECK_LINE_SYNC_CURSOR_STORAGE_KEY = 'borsouvertures.deck-line-sync-cursor';

export interface SyncCursorStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

// @FollowsBlueprint injected-storage-slice
export function readSyncCursor(
  storage: SyncCursorStorage | undefined,
  storageKey: string = SYNC_CURSOR_STORAGE_KEY,
): string | null {
  const saved = storage?.getItem(storageKey) ?? null;
  return saved === null || saved.length === 0 ? null : saved;
}

export function writeSyncCursor(
  storage: SyncCursorStorage | undefined,
  cursor: string | null,
  storageKey: string = SYNC_CURSOR_STORAGE_KEY,
): void {
  if (cursor === null) return;
  storage?.setItem(storageKey, cursor);
}
