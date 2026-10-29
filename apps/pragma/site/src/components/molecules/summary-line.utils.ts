/** @Feature setlists */

const NO_BREAK_SPACE = ' ';
const ORDINARY_SPACE = ' ';
const ITEM_SEPARATOR = `${NO_BREAK_SPACE}·${ORDINARY_SPACE}`;

// @FollowsBlueprint utils-pure-module
export function keepTogether(item: string): string {
  return item.replaceAll(ORDINARY_SPACE, NO_BREAK_SPACE);
}

export function joinSummaryItems(items: readonly (string | null)[]): string {
  return items
    .filter((item) => item !== null)
    .map(keepTogether)
    .join(ITEM_SEPARATOR);
}
