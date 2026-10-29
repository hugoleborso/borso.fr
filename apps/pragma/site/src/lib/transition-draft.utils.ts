const KEY_SEPARATOR = '>';

// @FollowsBlueprint utils-pure-module
export function buildTransitionDraftKey(songAId: string, songBId: string): string {
  return `${songAId}${KEY_SEPARATOR}${songBId}`;
}
