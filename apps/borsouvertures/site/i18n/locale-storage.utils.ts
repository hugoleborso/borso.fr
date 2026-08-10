import { isSupportedLanguage, type SupportedLanguage } from './i18n.utils';

export const LANGUAGE_STORAGE_KEY = 'borsouvertures.language';

/**
 * The slice of the `Storage` interface this module needs. Injecting it keeps
 * the read and the write pure enough to test with an in-memory stand-in, and
 * lets the caller pass `undefined` when there is no `window`.
 */
export interface LanguageStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function readSavedLanguage(storage: LanguageStorage | undefined): SupportedLanguage | null {
  if (storage === undefined) return null;
  const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(saved) ? saved : null;
}

export function writeSavedLanguage(
  storage: LanguageStorage | undefined,
  language: SupportedLanguage,
): void {
  if (storage === undefined) return;
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}
