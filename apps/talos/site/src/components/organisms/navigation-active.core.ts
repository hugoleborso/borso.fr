function isAtOrBelow(activePath: string, root: string): boolean {
  return activePath === root || activePath.startsWith(`${root}/`);
}

// @FollowsBlueprint core-view-intent
export function isNavigationDestinationActive(
  activePath: string,
  destination: string,
  aliases?: readonly string[],
): boolean {
  return (
    isAtOrBelow(activePath, destination) ||
    (aliases?.some((alias) => isAtOrBelow(activePath, alias)) ?? false)
  );
}

export function isBadgeShownOnTab(
  tabDestination: string,
  badgeDestination: string,
  badgeCount: number,
): boolean {
  return tabDestination === badgeDestination && badgeCount > 0;
}
