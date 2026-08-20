import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  type LanguageStorage,
  readSavedLanguage,
  writeSavedLanguage,
} from './locale-storage.utils';

function createMemoryStorage(initial: Record<string, string> = {}): LanguageStorage {
  const storedPairs = new Map(Object.entries(initial));
  return {
    getItem: (key) => storedPairs.get(key) ?? null,
    setItem: (key, value) => {
      storedPairs.set(key, value);
    },
  };
}

// @FollowsBlueprint test-pure-unit
describe('readSavedLanguage', () => {
  it('returns null when there is no storage', () => {
    expect(readSavedLanguage(undefined)).toBeNull();
  });

  it('returns null when nothing was saved', () => {
    expect(readSavedLanguage(createMemoryStorage())).toBeNull();
  });

  it('returns null when the saved value is not a supported language', () => {
    expect(readSavedLanguage(createMemoryStorage({ [LANGUAGE_STORAGE_KEY]: 'de' }))).toBeNull();
  });

  it('returns the saved language', () => {
    expect(readSavedLanguage(createMemoryStorage({ [LANGUAGE_STORAGE_KEY]: 'fr' }))).toBe('fr');
  });
});

describe('writeSavedLanguage', () => {
  it('does nothing when there is no storage', () => {
    expect(() => writeSavedLanguage(undefined, 'fr')).not.toThrow();
  });

  it('saves the language under the namespaced key', () => {
    const storage = createMemoryStorage();
    writeSavedLanguage(storage, 'fr');
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });
});
