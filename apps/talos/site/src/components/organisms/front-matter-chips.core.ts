import { selectPageLabel } from '../../lib/wikilinks.core';

const LIST_SEPARATOR = ',';
const DECORATION_PATTERN = /[[\]"']/g;
const PATH_SEPARATOR = '/';

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

export function selectFrontMatterEntries(
  frontMatter: Readonly<Record<string, string>>,
): [string, string][] {
  return Object.entries(frontMatter)
    .map(([key, rawValue]): [string, string] => [key, formatFrontMatterValue(rawValue)])
    .filter(([, value]) => value.length > 0);
}
