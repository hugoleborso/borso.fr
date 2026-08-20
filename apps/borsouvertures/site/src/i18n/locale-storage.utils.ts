import { isSupportedLanguage, type SupportedLanguage } from './i18n.utils';

export const LANGUAGE_STORAGE_KEY = 'borsouvertures.language';

/**
 * @Blueprint injected-storage-slice
 * @BlueprintName Injected Storage Slice
 * @BlueprintUsage Use when a module reads or writes a browser storage API and its logic still has to be testable without a browser.
 * @BlueprintDescription Declares the two methods the module actually calls as its own interface, rather than depending on the whole `Storage` type, so a test passes a plain object over a `Map` and `window.localStorage` satisfies it structurally with no adapter. The parameter is `LanguageStorage | undefined` and both functions return early on `undefined`, which is how a server render or a locked down browser is handled at the type level instead of behind a `typeof window` check.
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
