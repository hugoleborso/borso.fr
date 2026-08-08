/**
 * Pure helpers for the i18n layer:
 *  - `flattenKeys` walks a nested catalog and produces the sorted list
 *    of dotted leaf keys. The i18n parity test compares the flattened
 *    keys of `en.json` and `fr.json`; a difference fails CI.
 *  - `detectInitialLocale` picks `'fr'` or `'en'` based on the
 *    browser's `navigator.language` family. Default is `'fr'` per the
 *    spec (FR-first).
 */

export type SupportedLocale = 'fr' | 'en';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export type CatalogValue = string | CatalogTree;
export interface CatalogTree {
  [key: string]: CatalogValue;
}

export function flattenKeys(tree: CatalogTree, prefix = ''): readonly string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      keys.push(path);
    } else {
      keys.push(...flattenKeys(value, path));
    }
  }
  return keys.toSorted();
}

export function detectInitialLocale(navigatorLanguage: string | undefined): SupportedLocale {
  if (navigatorLanguage === undefined) return DEFAULT_LOCALE;
  const [family] = navigatorLanguage.toLowerCase().split('-');
  return SUPPORTED_LOCALES.find((locale) => locale === family) ?? DEFAULT_LOCALE;
}
