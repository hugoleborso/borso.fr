import { type Locale, SUPPORTED_LOCALES } from './i18n.utils';

export const LOCALE_STORAGE_KEY = 'banana-rush.locale';

// @FollowsBlueprint injected-storage-slice
export function readPersistedLocale(storage: Storage | undefined): Locale | null {
  if (storage === undefined) return null;
  const stored = storage.getItem(LOCALE_STORAGE_KEY);
  return SUPPORTED_LOCALES.find((locale) => locale === stored) ?? null;
}

export function persistLocale(storage: Storage | undefined, locale: Locale): void {
  if (storage === undefined) return;
  storage.setItem(LOCALE_STORAGE_KEY, locale);
}
