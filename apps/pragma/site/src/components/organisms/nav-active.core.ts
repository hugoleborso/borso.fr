/**
 * Which navigation destination the current path belongs to.
 *
 * A destination owns its sub-paths, so `/catalog/3/edit` still lights the
 * catalog tab up. Both the sidebar and the bottom bar ask the same question,
 * and asking it in one place is what keeps them agreeing.
 */

// @FollowsBlueprint core-decision
export function isNavDestinationActive(activePath: string, destination: string): boolean {
  return activePath.startsWith(destination);
}

/**
 * Whether the bottom bar's "more" tab is the one standing for where the reader
 * currently is. The tab carries no path of its own — it opens the drawer that
 * owns the admin destinations — so on `/members` and `/instruments` no tab lit
 * up at all and the bar said nothing about where you were.
 */
export function isMoreTabActive(
  activePath: string,
  moreDestinations: readonly string[],
  isMoreOpen: boolean,
): boolean {
  return (
    isMoreOpen ||
    moreDestinations.some((destination) => isNavDestinationActive(activePath, destination))
  );
}
