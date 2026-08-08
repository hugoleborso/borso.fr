import type english from './en.json';

export type SupportedLanguage = 'en' | 'fr';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['fr', 'en'];

/**
 * The copy on this site is written in French first, so a visitor whose browser
 * asks for neither French nor English still reads the source language.
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export type CatalogueValue = string | CatalogueTree;
export interface CatalogueTree {
  [segment: string]: CatalogueValue;
}

type DottedLeafPaths<Tree> = {
  [Segment in keyof Tree & string]: Tree[Segment] extends string
    ? Segment
    : `${Segment}.${DottedLeafPaths<Tree[Segment]>}`;
}[keyof Tree & string];

/**
 * Every dotted path that resolves to a string in `en.json`. Storing one of
 * these in a data file, rather than a bare `string`, is what makes a stale
 * content key a typecheck failure instead of a raw key rendered on the page.
 */
export type TranslationKey = DottedLeafPaths<typeof english>;

export function isSupportedLanguage(candidate: string): candidate is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === candidate);
}

const LANGUAGE_TAG_SEPARATOR = '-';

export function readLanguageFamily(languageTag: string): string {
  const lowercased = languageTag.toLowerCase();
  const separatorIndex = lowercased.indexOf(LANGUAGE_TAG_SEPARATOR);
  if (separatorIndex === -1) return lowercased;
  return lowercased.slice(0, separatorIndex);
}

/**
 * The saved choice wins, then the first browser language we support, then the
 * default. Both inputs are arguments so the decision stays testable without a
 * browser.
 */
export function selectInitialLanguage(
  savedLanguage: string | null,
  browserLanguages: readonly string[],
): SupportedLanguage {
  if (savedLanguage !== null && isSupportedLanguage(savedLanguage)) return savedLanguage;
  for (const browserLanguage of browserLanguages) {
    const family = readLanguageFamily(browserLanguage);
    if (isSupportedLanguage(family)) return family;
  }
  return DEFAULT_LANGUAGE;
}

const KEY_PATH_SEPARATOR = '.';

function sortAlphabetically(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function listTranslationKeys(tree: CatalogueTree, prefix = ''): readonly string[] {
  const paths: string[] = [];
  for (const [segment, value] of Object.entries(tree)) {
    const path = prefix === '' ? segment : `${prefix}${KEY_PATH_SEPARATOR}${segment}`;
    if (typeof value === 'string') {
      paths.push(path);
    } else {
      paths.push(...listTranslationKeys(value, path));
    }
  }
  return sortAlphabetically(paths);
}
