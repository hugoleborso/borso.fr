/** @Feature setlists */

// @FollowsBlueprint utils-pure-module
export function selectSetlistDisplayName(name: string, fallback: string): string {
  return name.trim().length > 0 ? name : fallback;
}
