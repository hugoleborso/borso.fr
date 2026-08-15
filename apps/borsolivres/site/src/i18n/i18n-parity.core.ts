/**
 * The catalogue parity gate. Two pure comparisons the sibling test runs over
 * the shipped catalogues, so an English string added without its French
 * counterpart, or copied into `fr.json` to silence the first check, fails the
 * build rather than reaching a reader.
 */

import { type CatalogueTree, flattenKeys } from './i18n.utils';

export interface CatalogueParityDifference {
  readonly missingInEnglish: readonly string[];
  readonly missingInFrench: readonly string[];
}

// @FollowsBlueprint i18n-parity-gate
export function diffCatalogues(
  english: CatalogueTree,
  french: CatalogueTree,
): CatalogueParityDifference {
  const englishKeys = new Set(flattenKeys(english));
  const frenchKeys = new Set(flattenKeys(french));
  return {
    missingInEnglish: [...frenchKeys].filter((key) => !englishKeys.has(key)),
    missingInFrench: [...englishKeys].filter((key) => !frenchKeys.has(key)),
  };
}

export function areCataloguesInParity(difference: CatalogueParityDifference): boolean {
  return difference.missingInEnglish.length === 0 && difference.missingInFrench.length === 0;
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
 * alone stays green when an English value is pasted into `fr.json`, so the
 * sibling test asserts this list equals a named allowlist of the entries that
 * genuinely read the same in both languages.
 */
export function listIdenticalValueKeys(
  english: CatalogueTree,
  french: CatalogueTree,
): readonly string[] {
  const identical: string[] = [];
  collectIdenticalValueKeys(english, french, '', identical);
  return identical.toSorted();
}
