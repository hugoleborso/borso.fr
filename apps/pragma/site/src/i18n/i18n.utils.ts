export type SupportedLocale = 'fr' | 'en';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export type CatalogValue = string | CatalogTree;
export interface CatalogTree {
  [key: string]: CatalogValue;
}

// @FollowsBlueprint i18n-key-walk
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
