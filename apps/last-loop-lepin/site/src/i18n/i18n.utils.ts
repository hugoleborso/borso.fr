/**
 * Pure helpers for the i18n layer.
 *
 * `flattenKeys` turns a nested catalogue into its sorted list of dotted leaf
 * keys, which is what the parity gate compares. `selectInitialLanguage` picks
 * the language to start in from the saved choice and the browser languages,
 * both passed in, so the decision is testable without a browser.
 */

export type SupportedLanguage = 'fr' | 'en';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['fr', 'en'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export type CatalogueValue = string | CatalogueTree;
export interface CatalogueTree {
  readonly [key: string]: CatalogueValue;
}

/** Code point order, so the sorted key lists do not depend on a locale. */
export function compareCatalogueKeys(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

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

function isSupportedLanguage(candidate: string): candidate is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === candidate);
}

/** The language family of a browser language tag, e.g. `fr` for `fr-CA`. */
function readLanguageFamily(languageTag: string): string {
  const lowercased = languageTag.toLowerCase();
  const dashIndex = lowercased.indexOf('-');
  if (dashIndex === -1) return lowercased;
  return lowercased.slice(0, dashIndex);
}

/**
 * Choose the language the application starts in. The saved choice wins, then
 * the first browser language whose family we support, then French.
 */
export function selectInitialLanguage(
  savedLanguage: string | null,
  browserLanguages: readonly string[],
): SupportedLanguage {
  if (savedLanguage !== null && isSupportedLanguage(savedLanguage)) return savedLanguage;
  for (const languageTag of browserLanguages) {
    const family = readLanguageFamily(languageTag);
    if (isSupportedLanguage(family)) return family;
  }
  return DEFAULT_LANGUAGE;
}
