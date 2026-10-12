// @FollowsBlueprint core-view-intent
export function isNavigationDestinationActive(activePath: string, destination: string): boolean {
  return activePath === destination || activePath.startsWith(`${destination}/`);
}

export function isBadgeShownOnTab(
  tabDestination: string,
  badgeDestination: string,
  badgeCount: number,
): boolean {
  return tabDestination === badgeDestination && badgeCount > 0;
}
