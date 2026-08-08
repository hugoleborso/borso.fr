import type english from './en.json';

/**
 * The only language this site renders. There is no switcher and no browser
 * negotiation: borso.fr is French, and `en.json` exists as the reference
 * catalogue the parity test compares against rather than as a second edition.
 */
export const DEFAULT_LANGUAGE = 'fr';

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
