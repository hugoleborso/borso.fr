import { describe, expect, it } from 'vitest';
import {
  LOCALE_STORAGE_KEY,
  type LocaleStorage,
  readPersistedLocale,
  writePersistedLocale,
} from './locale-storage.utils';

function memoryStorage(initial: Record<string, string> = {}): LocaleStorage & {
  store: Record<string, string>;
} {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key) => (key in store ? (store[key] ?? null) : null),
    setItem: (key, value) => {
      store[key] = value;
    },
  };
}

describe('locale-storage.utils', () => {
  describe('readPersistedLocale', () => {
    it('returns null when no storage is available', () => {
      expect(readPersistedLocale(undefined)).toBeNull();
    });

    it('returns null when nothing is persisted', () => {
      expect(readPersistedLocale(memoryStorage())).toBeNull();
    });

    it('returns the persisted locale when it is supported', () => {
      const storage = memoryStorage({ [LOCALE_STORAGE_KEY]: 'fr' });
      expect(readPersistedLocale(storage)).toBe('fr');
    });

    it('returns the persisted English locale', () => {
      const storage = memoryStorage({ [LOCALE_STORAGE_KEY]: 'en' });
      expect(readPersistedLocale(storage)).toBe('en');
    });

    it('returns null when the persisted value is not a supported locale', () => {
      const storage = memoryStorage({ [LOCALE_STORAGE_KEY]: 'de' });
      expect(readPersistedLocale(storage)).toBeNull();
    });
  });

  describe('writePersistedLocale', () => {
    it('is a no-op when no storage is available', () => {
      expect(() => writePersistedLocale(undefined, 'en')).not.toThrow();
    });

    it('writes the locale under the canonical key', () => {
      const storage = memoryStorage();
      writePersistedLocale(storage, 'en');
      expect(storage.store[LOCALE_STORAGE_KEY]).toBe('en');
    });

    it('overwrites a previously stored locale', () => {
      const storage = memoryStorage({ [LOCALE_STORAGE_KEY]: 'fr' });
      writePersistedLocale(storage, 'en');
      expect(storage.store[LOCALE_STORAGE_KEY]).toBe('en');
    });
  });
});
