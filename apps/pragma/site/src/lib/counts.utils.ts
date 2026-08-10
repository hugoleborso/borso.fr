/**
 * Whether a count is worth showing.
 *
 * Three surfaces ask the same question of three different counts — the nav
 * badge, the stale-bar banner, the guest tally on a concert header — and all
 * three mean "there is something here" rather than "this number is above a
 * threshold". A count nobody has computed yet reads the same way as zero.
 */

const NOTHING_COUNTED = 0;

// @FollowsBlueprint utils-pure-module
export function isPositiveCount(count: number | undefined): boolean {
  return (count ?? NOTHING_COUNTED) > NOTHING_COUNTED;
}
