import { describe, expect, it, vi } from 'vitest';
import { LOCALE_STORAGE_KEY, persistLocale, readPersistedLocale } from './locale-storage.utils';

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  return {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: () => null,
    length: 0,
    ...overrides,
  };
}

function storageHolding(value: string | null): Storage {
  return fakeStorage({ getItem: () => value });
}

// @FollowsBlueprint test-pure-unit
describe('readPersistedLocale', () => {
  it('reads a locale the game speaks', () => {
    expect(readPersistedLocale(storageHolding('en'))).toBe('en');
  });

  it('reads the other locale the game speaks', () => {
    expect(readPersistedLocale(storageHolding('fr'))).toBe('fr');
  });

  it('ignores a locale the game does not speak', () => {
    expect(readPersistedLocale(storageHolding('de'))).toBeNull();
  });

  it('answers nothing when nothing was stored', () => {
    expect(readPersistedLocale(storageHolding(null))).toBeNull();
  });

  it('answers nothing, rather than failing, when there is no storage at all', () => {
    expect(readPersistedLocale(undefined)).toBeNull();
  });

  it('reads the value under the key the writer uses', () => {
    const getItem = vi.fn(() => 'en');
    readPersistedLocale(fakeStorage({ getItem }));
    expect(getItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY);
  });
});

describe('persistLocale', () => {
  it('writes the locale under the key the reader reads back', () => {
    const setItem = vi.fn();
    persistLocale(fakeStorage({ setItem }), 'en');
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'en');
  });

  it('does nothing, rather than failing, when there is no storage at all', () => {
    expect(() => {
      persistLocale(undefined, 'en');
    }).not.toThrow();
  });
});
