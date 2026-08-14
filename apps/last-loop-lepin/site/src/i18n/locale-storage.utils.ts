/**
 * Pure helpers around the saved language entry. The `Storage` dependency is
 * injected by the caller, so the runtime passes `window.localStorage` and a
 * test passes an in-memory stand-in.
 */

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './i18n.utils';

export const LANGUAGE_STORAGE_KEY = 'last-loop-lepin.language';

export interface LanguageStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

function isSupportedLanguage(candidate: string | null): candidate is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === candidate);
}

// @FollowsBlueprint injected-storage-slice
export function readSavedLanguage(storage: LanguageStorage | undefined): SupportedLanguage | null {
  if (storage === undefined) return null;
  const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
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
