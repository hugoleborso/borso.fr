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

// @FollowsBlueprint i18n-parity-gate
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

const KEY_PATH_SEPARATOR = '.';

function collectIdenticalValueKeys(
  english: CatalogueTree,
  french: CatalogueTree,
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
 * sibling test asserts this list equals a named allowlist of the entries that
 * genuinely read the same in both languages.
 */
export function listIdenticalValueKeys(
  english: CatalogueTree,
  french: CatalogueTree,
): readonly string[] {
  const identical: string[] = [];
  collectIdenticalValueKeys(english, french, '', identical);
  return identical.toSorted(compareCatalogueKeys);
}
