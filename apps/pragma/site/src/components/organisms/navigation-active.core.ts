/** @Feature shell */

// @FollowsBlueprint core-decision
export function isNavigationDestinationActive(activePath: string, destination: string): boolean {
  return activePath.startsWith(destination);
}

export function isMoreTabActive(
  activePath: string,
  moreDestinations: readonly string[],
  isMoreOpen: boolean,
): boolean {
  return (
    isMoreOpen ||
    moreDestinations.some((destination) => isNavigationDestinationActive(activePath, destination))
  );
}
