const NOT_AN_IDENTIFIER_CHARACTER = /[^\w-]/g;
const ANCHOR_PREFIX = '--menu-';

// @FollowsBlueprint utils-pure-module
export function toAnchorName(popoverId: string): string {
  return `${ANCHOR_PREFIX}${popoverId.replaceAll(NOT_AN_IDENTIFIER_CHARACTER, '')}`;
}
