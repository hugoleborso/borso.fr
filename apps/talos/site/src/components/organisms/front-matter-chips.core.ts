import type { ParseKeys } from 'i18next';
import { selectClosenessNameKey } from '../../lib/closeness-name.core';
import { selectPageLabel } from '../../lib/wikilinks.core';

const LIST_SEPARATOR = ',';
const DECORATION_PATTERN = /[[\]"']/g;
const PATH_SEPARATOR = '/';
const TYPE_KEY = 'type';
const CLOSENESS_KEY = 'proximite';
const UNTYPED_KIND = '';
const NAME_SEPARATOR = ' · ';

function formatItem(item: string): string {
  const bare = item.replaceAll(DECORATION_PATTERN, '').trim();
  return bare.includes(PATH_SEPARATOR) ? selectPageLabel(bare) : bare;
}

// @FollowsBlueprint core-view-projection
export function formatFrontMatterValue(rawValue: string): string {
  return rawValue
    .split(LIST_SEPARATOR)
    .map(formatItem)
    .filter((item) => item.length > 0)
    .join(', ');
}

function nameCloseness(value: string, kind: string, translate: (key: ParseKeys) => string): string {
  const nameKey = selectClosenessNameKey(value, kind);
  return nameKey === null ? value : `${value}${NAME_SEPARATOR}${translate(nameKey)}`;
}

export function selectFrontMatterEntries(
  frontMatter: Readonly<Record<string, string>>,
  translate: (key: ParseKeys) => string,
): [string, string][] {
  const filledEntries = Object.entries(frontMatter)
    .map(([key, rawValue]): [string, string] => [key, formatFrontMatterValue(rawValue)])
    .filter(([, value]) => value.length > 0);
  const kind = new Map(filledEntries).get(TYPE_KEY) ?? UNTYPED_KIND;
  return filledEntries.map(([key, value]) => [
    key,
    key === CLOSENESS_KEY ? nameCloseness(value, kind, translate) : value,
  ]);
}
