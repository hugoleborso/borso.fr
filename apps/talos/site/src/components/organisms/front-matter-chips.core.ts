import type { ParseKeys } from 'i18next';
import { selectClosenessNameKey } from '../../lib/closeness-name.core';
import { selectPageLabel } from '../../lib/wikilinks.core';

const LIST_SEPARATOR = ',';
const DECORATION_PATTERN = /[[\]"']/g;
const PATH_SEPARATOR = '/';
const TYPE_KEY = 'type';
const PERSON_TYPE = 'personne';
const CLOSENESS_KEY = 'proximite';
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

function nameCloseness(value: string, translate: (key: ParseKeys) => string): string {
  const nameKey = selectClosenessNameKey(value);
  return nameKey === null ? value : `${value}${NAME_SEPARATOR}${translate(nameKey)}`;
}

export function selectFrontMatterEntries(
  frontMatter: Readonly<Record<string, string>>,
  translate: (key: ParseKeys) => string,
): [string, string][] {
  const filledEntries = Object.entries(frontMatter)
    .map(([key, rawValue]): [string, string] => [key, formatFrontMatterValue(rawValue)])
    .filter(([, value]) => value.length > 0);
  const isPerson = filledEntries.some(([key, value]) => key === TYPE_KEY && value === PERSON_TYPE);
  return filledEntries.map(([key, value]) => [
    key,
    isPerson && key === CLOSENESS_KEY ? nameCloseness(value, translate) : value,
  ]);
}
