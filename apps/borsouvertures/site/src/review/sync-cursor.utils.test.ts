import { describe, expect, it } from 'vitest';
import {
  DECK_LINE_SYNC_CURSOR_STORAGE_KEY,
  readSyncCursor,
  SYNC_CURSOR_STORAGE_KEY,
  writeSyncCursor,
} from './sync-cursor.utils';

function buildStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

// @FollowsBlueprint test-pure-unit
describe('the sync cursor', () => {
  it('is kept under the sync cursor key and read back', () => {
    const storage = buildStorage();
    writeSyncCursor(storage, 'resume~a~b');
    expect(SYNC_CURSOR_STORAGE_KEY).toBe('borsouvertures.sync-cursor');
    expect(storage.values.get('borsouvertures.sync-cursor')).toBe('resume~a~b');
    expect(readSyncCursor(storage)).toBe('resume~a~b');
  });

  it('starts from the beginning on a device that holds none, or an empty one', () => {
    expect(readSyncCursor(buildStorage())).toBeNull();
    expect(readSyncCursor(buildStorage({ 'borsouvertures.sync-cursor': '' }))).toBeNull();
  });

  it('keeps the cursor it holds when the API answered none', () => {
    const storage = buildStorage({ 'borsouvertures.sync-cursor': 'resume~a~b' });
    writeSyncCursor(storage, null);
    expect(storage.values.get('borsouvertures.sync-cursor')).toBe('resume~a~b');
  });

  it('reads and writes nothing in a browser with no storage', () => {
    expect(readSyncCursor(undefined)).toBeNull();
    expect(() => {
      writeSyncCursor(undefined, 'resume~a~b');
    }).not.toThrow();
  });

  it('keeps the deck line cursor under its own key, apart from the review cursor', () => {
    const storage = buildStorage({ 'borsouvertures.sync-cursor': 'resume~review~b' });
    writeSyncCursor(storage, 'resume~line~b', DECK_LINE_SYNC_CURSOR_STORAGE_KEY);
    expect(storage.values.get('borsouvertures.deck-line-sync-cursor')).toBe('resume~line~b');
    expect(readSyncCursor(storage, DECK_LINE_SYNC_CURSOR_STORAGE_KEY)).toBe('resume~line~b');
    expect(readSyncCursor(storage)).toBe('resume~review~b');
  });
});
