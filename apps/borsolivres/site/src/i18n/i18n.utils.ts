/**
 * Pure helpers for the i18n layer. `flattenKeys` walks a catalogue into the
 * sorted list of dotted leaf keys the parity gate compares, and
 * `selectInitialLocale` picks the language a first visit starts in.
 */

export type SupportedLocale = 'fr' | 'en';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export type CatalogueValue = string | CatalogueTree;
export interface CatalogueTree {
  [key: string]: CatalogueValue;
}

const KEY_PATH_SEPARATOR = '.';

// @FollowsBlueprint i18n-key-walk
export function flattenKeys(tree: CatalogueTree, prefix = ''): readonly string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}${KEY_PATH_SEPARATOR}${key}`;
    if (typeof value === 'string') {
      keys.push(path);
    } else {
      keys.push(...flattenKeys(value, path));
    }
  }
  return keys.toSorted();
}

/**
 * The saved choice first, then the browser's language family, then French,
 * which is the language this reading list is kept in.
 */
export function selectInitialLocale(
  savedLocale: SupportedLocale | null,
  browserLanguage: string | undefined,
): SupportedLocale {
  if (savedLocale !== null) return savedLocale;
  if (browserLanguage === undefined) return DEFAULT_LOCALE;
  const [family] = browserLanguage.toLowerCase().split('-');
  return SUPPORTED_LOCALES.find((locale) => locale === family) ?? DEFAULT_LOCALE;
}
