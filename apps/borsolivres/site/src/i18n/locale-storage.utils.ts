/**
 * The `borsolivres.locale` storage entry, read and written through an
 * injected storage rather than `window.localStorage`, so a test passes a plain
 * object and a locked-down browser is handled at the type level.
 */

import { SUPPORTED_LOCALES, type SupportedLocale } from './i18n.utils';

export const LOCALE_STORAGE_KEY = 'borsolivres.locale';

export interface LocaleStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function isSupportedLocale(candidate: string | null): candidate is SupportedLocale {
  return SUPPORTED_LOCALES.some((supported) => supported === candidate);
}

// @FollowsBlueprint injected-storage-slice
export function readPersistedLocale(storage: LocaleStorage | undefined): SupportedLocale | null {
  if (storage === undefined) return null;
  const stored = storage.getItem(LOCALE_STORAGE_KEY);
  if (!isSupportedLocale(stored)) return null;
  return stored;
}

export function writePersistedLocale(
  storage: LocaleStorage | undefined,
  locale: SupportedLocale,
): void {
  if (storage === undefined) return;
  storage.setItem(LOCALE_STORAGE_KEY, locale);
}
