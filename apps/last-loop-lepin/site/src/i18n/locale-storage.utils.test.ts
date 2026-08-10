import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  type LanguageStorage,
  readSavedLanguage,
  writeSavedLanguage,
} from './locale-storage.utils';

function buildStorage(initial: Record<string, string> = {}): LanguageStorage & {
  readonly entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

describe('readSavedLanguage', () => {
  it('returns null when there is no storage', () => {
    expect(readSavedLanguage(undefined)).toBeNull();
  });

  it('returns null when nothing has been saved', () => {
    expect(readSavedLanguage(buildStorage())).toBeNull();
  });

  it('returns null when the saved value is not a supported language', () => {
    expect(readSavedLanguage(buildStorage({ [LANGUAGE_STORAGE_KEY]: 'de' }))).toBeNull();
  });

  it('returns the saved language when it is supported', () => {
    expect(readSavedLanguage(buildStorage({ [LANGUAGE_STORAGE_KEY]: 'en' }))).toBe('en');
  });
});

describe('writeSavedLanguage', () => {
  it('does nothing when there is no storage', () => {
    expect(() => {
      writeSavedLanguage(undefined, 'fr');
    }).not.toThrow();
  });

  it('saves the language under the shared key', () => {
    const storage = buildStorage();
    writeSavedLanguage(storage, 'en');
    expect(storage.entries.get(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
