/**
 * Pure helpers around the `pragma.locale` localStorage entry. Kept in
 * a `.utils.ts` so the read/write logic can be tested in isolation,
 * with the `Storage` dependency injected by the caller. The runtime
 * AppShell injects `window.localStorage`; the test injects an in-memory
 * stand-in.
 */

import { type SupportedLocale, SUPPORTED_LOCALES } from './i18n.utils';

export const LOCALE_STORAGE_KEY = 'pragma.locale';

export interface LocaleStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function isSupportedLocale(candidate: string): candidate is SupportedLocale {
  return SUPPORTED_LOCALES.some((supported) => supported === candidate);
}

export function readPersistedLocale(storage: LocaleStorage | undefined): SupportedLocale | null {
  if (storage === undefined) return null;
  const stored = storage.getItem(LOCALE_STORAGE_KEY);
  if (stored === null) return null;
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
