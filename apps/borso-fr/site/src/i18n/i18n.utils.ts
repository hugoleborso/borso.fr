import type english from './en.json';

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

export type TranslationKey = DottedLeafPaths<typeof english>;

const KEY_PATH_SEPARATOR = '.';

export function compareTranslationKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

// @FollowsBlueprint i18n-key-walk
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
  return paths.sort(compareTranslationKeys);
}
