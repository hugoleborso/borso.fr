/**
 * The key parity gate between the two catalogues. Returns the keys missing on
 * each side so the sibling test can fail with the exact list rather than a
 * bare "catalogues differ".
 *
 * A `.core.ts` rather than a `.utils.ts` because it states a rule of the i18n
 * layer: the two catalogues carry the same leaf set, always.
 */

import { type CatalogueTree, compareCatalogueKeys, flattenKeys } from './i18n.utils';

export interface CatalogueParityDiff {
  readonly missingInEnglish: readonly string[];
  readonly missingInFrench: readonly string[];
}

export function diffCatalogues(english: CatalogueTree, french: CatalogueTree): CatalogueParityDiff {
  const englishKeys = new Set(flattenKeys(english));
  const frenchKeys = new Set(flattenKeys(french));
  const missingInEnglish: string[] = [];
  const missingInFrench: string[] = [];
  for (const key of frenchKeys) {
    if (!englishKeys.has(key)) missingInEnglish.push(key);
  }
  for (const key of englishKeys) {
    if (!frenchKeys.has(key)) missingInFrench.push(key);
  }
  return {
    missingInEnglish: missingInEnglish.toSorted(compareCatalogueKeys),
    missingInFrench: missingInFrench.toSorted(compareCatalogueKeys),
  };
}

export function isInParity(diff: CatalogueParityDiff): boolean {
  return diff.missingInEnglish.length === 0 && diff.missingInFrench.length === 0;
}
