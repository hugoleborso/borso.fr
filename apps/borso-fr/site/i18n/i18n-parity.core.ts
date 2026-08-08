import { type CatalogueTree, listTranslationKeys } from './i18n.utils';

function sortAlphabetically(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export interface CatalogueParityDiff {
  readonly missingInEnglish: readonly string[];
  readonly missingInFrench: readonly string[];
}

/**
 * The two catalogues carry the exact same leaf set. This returns the two
 * directions of the difference so the sibling test can fail with the precise
 * list rather than a boolean.
 */
export function diffCatalogues(english: CatalogueTree, french: CatalogueTree): CatalogueParityDiff {
  const englishKeys = new Set(listTranslationKeys(english));
  const frenchKeys = new Set(listTranslationKeys(french));
  const missingInEnglish: string[] = [];
  const missingInFrench: string[] = [];
  for (const key of frenchKeys) {
    if (!englishKeys.has(key)) missingInEnglish.push(key);
  }
  for (const key of englishKeys) {
    if (!frenchKeys.has(key)) missingInFrench.push(key);
  }
  return {
    missingInEnglish: sortAlphabetically(missingInEnglish),
    missingInFrench: sortAlphabetically(missingInFrench),
  };
}

export function isInParity(diff: CatalogueParityDiff): boolean {
  return diff.missingInEnglish.length === 0 && diff.missingInFrench.length === 0;
}
