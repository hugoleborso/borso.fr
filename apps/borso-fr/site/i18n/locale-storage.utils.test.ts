import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  type LanguageStorage,
  readSavedLanguage,
  writeSavedLanguage,
} from './locale-storage.utils';

function inMemoryStorage(initial: Record<string, string> = {}): LanguageStorage {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

describe('readSavedLanguage', () => {
  it('returns the saved language when it is supported', () => {
    expect(readSavedLanguage(inMemoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en' }))).toBe('en');
  });

  it('returns null when nothing was saved', () => {
    expect(readSavedLanguage(inMemoryStorage())).toBeNull();
  });

  it('returns null when the saved value names no supported language', () => {
    expect(readSavedLanguage(inMemoryStorage({ [LANGUAGE_STORAGE_KEY]: 'de' }))).toBeNull();
  });

  it('returns null when there is no storage at all', () => {
    expect(readSavedLanguage(undefined)).toBeNull();
  });
});

describe('writeSavedLanguage', () => {
  it('saves the language under the shared key', () => {
    const storage = inMemoryStorage();
    writeSavedLanguage(storage, 'en');
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('does nothing when there is no storage at all', () => {
    expect(() => writeSavedLanguage(undefined, 'fr')).not.toThrow();
  });
});
