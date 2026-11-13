export const SYNC_CURSOR_STORAGE_KEY = 'borsouvertures.sync-cursor';

export interface SyncCursorStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

// @FollowsBlueprint injected-storage-slice
export function readSyncCursor(storage: SyncCursorStorage | undefined): string | null {
  const saved = storage?.getItem(SYNC_CURSOR_STORAGE_KEY) ?? null;
  return saved === null || saved.length === 0 ? null : saved;
}

export function writeSyncCursor(
  storage: SyncCursorStorage | undefined,
  cursor: string | null,
): void {
  if (cursor === null) return;
  storage?.setItem(SYNC_CURSOR_STORAGE_KEY, cursor);
}
