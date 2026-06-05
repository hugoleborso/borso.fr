/**
 * The i18n key-parity gate. Returns a deterministic diff between the
 * `en` and `fr` catalogs so the calling test can fail with a precise
 * list of missing keys on either side.
 *
 * Kept as a `.core.ts` (not `.utils.ts`) because it expresses a domain
 * rule of the i18n layer: "the two catalogs MUST carry the exact same
 * leaf set". The gating sibling test is `i18n-parity.core.test.ts`.
 */

import { type CatalogTree, flattenKeys } from './i18n.utils';

export interface ParityDiff {
  readonly missingInEn: readonly string[];
  readonly missingInFr: readonly string[];
}

export function diffCatalogs(en: CatalogTree, fr: CatalogTree): ParityDiff {
  const enKeys = new Set(flattenKeys(en));
  const frKeys = new Set(flattenKeys(fr));
  const missingInEn: string[] = [];
  const missingInFr: string[] = [];
  for (const key of frKeys) {
    if (!enKeys.has(key)) missingInEn.push(key);
  }
  for (const key of enKeys) {
    if (!frKeys.has(key)) missingInFr.push(key);
  }
  return {
    missingInEn: missingInEn.toSorted(),
    missingInFr: missingInFr.toSorted(),
  };
}

export function isInParity(diff: ParityDiff): boolean {
  return diff.missingInEn.length === 0 && diff.missingInFr.length === 0;
}
