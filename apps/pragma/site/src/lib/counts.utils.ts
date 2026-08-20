const NOTHING_COUNTED = 0;

// @FollowsBlueprint utils-pure-module
export function isPositiveCount(count: number | undefined): boolean {
  return (count ?? NOTHING_COUNTED) > NOTHING_COUNTED;
}
