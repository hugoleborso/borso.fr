export type SupportedLanguage = 'en' | 'fr';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'fr'];
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

const LANGUAGE_TAG_SEPARATOR = '-';

export function compareTranslationKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

export type TranslationValue = string | TranslationCatalogue;
export interface TranslationCatalogue {
  [segment: string]: TranslationValue;
}

/**
 * Walk a nested catalogue and return every leaf key as a sorted dotted path,
 * e.g. `selection.side.white`. The parity gate compares the two lists.
 */
export function listTranslationKeys(
  catalogue: TranslationCatalogue,
  prefix = '',
): readonly string[] {
  const keys: string[] = [];
  for (const [segment, value] of Object.entries(catalogue)) {
    const path = prefix === '' ? segment : `${prefix}.${segment}`;
    if (typeof value === 'string') {
      keys.push(path);
    } else {
      keys.push(...listTranslationKeys(value, path));
    }
  }
  return keys.sort(compareTranslationKeys);
}

export function isSupportedLanguage(candidate: unknown): candidate is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === candidate);
}

/**
 * The language family of a BCP 47 tag, e.g. `fr` for `fr-CA`.
 */
export function readLanguageFamily(languageTag: string): string {
  const lowercased = languageTag.toLowerCase();
  const separatorIndex = lowercased.indexOf(LANGUAGE_TAG_SEPARATOR);
  if (separatorIndex === -1) return lowercased;
  return lowercased.slice(0, separatorIndex);
}

/**
 * The saved choice wins, then the first browser language we support, then
 * English. Both inputs are arguments, so the decision is pure and tested.
 */
export function selectInitialLanguage(
  savedLanguage: string | null,
  browserLanguages: readonly string[],
): SupportedLanguage {
  if (isSupportedLanguage(savedLanguage)) return savedLanguage;
  const matched = browserLanguages
    .map((languageTag) => readLanguageFamily(languageTag))
    .find((family): family is SupportedLanguage => isSupportedLanguage(family));
  return matched ?? FALLBACK_LANGUAGE;
}
