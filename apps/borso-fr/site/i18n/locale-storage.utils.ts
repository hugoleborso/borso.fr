import { isSupportedLanguage, type SupportedLanguage } from './i18n.utils';

export const LANGUAGE_STORAGE_KEY = 'borso-fr.language';

/**
 * The slice of `Storage` this module needs. Narrowing it to two methods lets a
 * test pass a plain object instead of standing up a browser storage.
 */
export interface LanguageStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function readSavedLanguage(storage: LanguageStorage | undefined): SupportedLanguage | null {
  if (storage === undefined) return null;
  const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === null) return null;
  if (!isSupportedLanguage(saved)) return null;
  return saved;
}

export function writeSavedLanguage(
  storage: LanguageStorage | undefined,
  language: SupportedLanguage,
): void {
  if (storage === undefined) return;
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}
