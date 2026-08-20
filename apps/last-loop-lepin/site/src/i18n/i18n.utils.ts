export type SupportedLanguage = 'fr' | 'en';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['fr', 'en'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export type CatalogueValue = string | CatalogueTree;
export interface CatalogueTree {
  readonly [key: string]: CatalogueValue;
}

export function compareCatalogueKeys(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// @FollowsBlueprint i18n-key-walk
export function flattenKeys(tree: CatalogueTree, prefix = ''): readonly string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      keys.push(path);
    } else {
      keys.push(...flattenKeys(value, path));
    }
  }
  return keys.toSorted(compareCatalogueKeys);
}

function isSupportedLanguage(candidate: string | null): candidate is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === candidate);
}

function readLanguageFamily(languageTag: string): string {
  const lowercased = languageTag.toLowerCase();
  const dashIndex = lowercased.indexOf('-');
  if (dashIndex === -1) return lowercased;
  return lowercased.slice(0, dashIndex);
}

export function selectInitialLanguage(
  savedLanguage: string | null,
  browserLanguages: readonly string[],
): SupportedLanguage {
  if (isSupportedLanguage(savedLanguage)) return savedLanguage;
  for (const languageTag of browserLanguages) {
    const family = readLanguageFamily(languageTag);
    if (isSupportedLanguage(family)) return family;
  }
  return DEFAULT_LANGUAGE;
}
