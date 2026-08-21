import { type CatalogTree, flattenKeys } from './i18n.utils';

export interface ParityDiff {
  readonly missingInEn: readonly string[];
  readonly missingInFr: readonly string[];
}

// @FollowsBlueprint i18n-parity-gate
export function diffCatalogs(english: CatalogTree, french: CatalogTree): ParityDiff {
  const englishKeys = new Set(flattenKeys(english));
  const frenchKeys = new Set(flattenKeys(french));
  const missingInEn: string[] = [];
  const missingInFr: string[] = [];
  for (const key of frenchKeys) {
    if (!englishKeys.has(key)) missingInEn.push(key);
  }
  for (const key of englishKeys) {
    if (!frenchKeys.has(key)) missingInFr.push(key);
  }
  return {
    missingInEn: missingInEn.toSorted(),
    missingInFr: missingInFr.toSorted(),
  };
}

export function isInParity(diff: ParityDiff): boolean {
  return diff.missingInEn.length === 0 && diff.missingInFr.length === 0;
}

const KEY_PATH_SEPARATOR = '.';

function collectIdenticalValueKeys(
  english: CatalogTree,
  french: CatalogTree,
  prefix: string,
  identical: string[],
): void {
  for (const [key, englishValue] of Object.entries(english)) {
    const path = prefix === '' ? key : `${prefix}${KEY_PATH_SEPARATOR}${key}`;
    const frenchValue = french[key];
    if (typeof englishValue === 'string') {
      if (frenchValue === englishValue) identical.push(path);
    } else if (typeof frenchValue === 'object') {
      collectIdenticalValueKeys(englishValue, frenchValue, path, identical);
    }
  }
}

export function listIdenticalValueKeys(
  english: CatalogTree,
  french: CatalogTree,
): readonly string[] {
  const identical: string[] = [];
  collectIdenticalValueKeys(english, french, '', identical);
  return identical.toSorted();
}
