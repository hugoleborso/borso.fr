import {
  compareTranslationKeys,
  listTranslationKeys,
  type TranslationCatalogue,
} from './i18n.utils';

export interface CatalogueParityDifference {
  readonly missingInEnglish: readonly string[];
  readonly missingInFrench: readonly string[];
}

/**
 * The keys each catalogue is missing relative to the other. The sibling test
 * fails when either list is non-empty, so an English string added without its
 * French counterpart never merges.
 */
export function diffCatalogues(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
): CatalogueParityDifference {
  const englishKeys = new Set(listTranslationKeys(english));
  const frenchKeys = new Set(listTranslationKeys(french));
  const missingInEnglish = [...frenchKeys].filter((key) => !englishKeys.has(key));
  const missingInFrench = [...englishKeys].filter((key) => !frenchKeys.has(key));
  return {
    missingInEnglish: missingInEnglish.sort(compareTranslationKeys),
    missingInFrench: missingInFrench.sort(compareTranslationKeys),
  };
}

export function areCataloguesInParity(difference: CatalogueParityDifference): boolean {
  return difference.missingInEnglish.length === 0 && difference.missingInFrench.length === 0;
}

const KEY_PATH_SEPARATOR = '.';

function collectIdenticalValueKeys(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
  prefix: string,
  identical: string[],
): void {
  for (const [segment, englishValue] of Object.entries(english)) {
    const path = prefix === '' ? segment : `${prefix}${KEY_PATH_SEPARATOR}${segment}`;
    const frenchValue = french[segment];
    if (typeof englishValue === 'string') {
      if (frenchValue === englishValue) identical.push(path);
    } else if (typeof frenchValue === 'object') {
      collectIdenticalValueKeys(englishValue, frenchValue, path, identical);
    }
  }
}

/**
 * Every key whose two catalogues carry the byte-identical string. Key parity
 * alone stays green when an English value is copied into `fr.json`, so the
 * sibling test asserts this list equals a named allowlist of the words that
 * genuinely read the same in both languages.
 */
export function listIdenticalValueKeys(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
): readonly string[] {
  const identical: string[] = [];
  collectIdenticalValueKeys(english, french, '', identical);
  return identical.sort(compareTranslationKeys);
}
