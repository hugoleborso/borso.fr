import { describe, expect, it } from 'vitest';
import {
  LOCALE_STORAGE_KEY,
  readPersistedLocale,
  writePersistedLocale,
} from './locale-storage.utils';

function buildStorage(initial: Record<string, string> = {}) {
  const storedValues = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storedValues.set(key, value);
    },
    entries: storedValues,
  };
}

// @FollowsBlueprint test-pure-unit
describe('readPersistedLocale', () => {
  it('reads a saved locale the application supports', () => {
    expect(readPersistedLocale(buildStorage({ [LOCALE_STORAGE_KEY]: 'en' }))).toBe('en');
  });

  it('ignores a saved value that is not a locale the application carries', () => {
    expect(readPersistedLocale(buildStorage({ [LOCALE_STORAGE_KEY]: 'de' }))).toBeNull();
  });

  it('reads no locale when nothing was ever saved', () => {
    expect(readPersistedLocale(buildStorage())).toBeNull();
  });

  it('reads no locale when the browser exposes no storage at all', () => {
    expect(readPersistedLocale(undefined)).toBeNull();
  });
});

describe('writePersistedLocale', () => {
  it('saves the locale under the application key', () => {
    const storage = buildStorage();
    writePersistedLocale(storage, 'en');
    expect(storage.entries.get(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('does nothing when the browser exposes no storage at all', () => {
    expect(() => {
      writePersistedLocale(undefined, 'fr');
    }).not.toThrow();
  });
});
