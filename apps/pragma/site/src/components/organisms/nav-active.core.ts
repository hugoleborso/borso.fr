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
