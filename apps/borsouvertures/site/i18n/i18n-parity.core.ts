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
