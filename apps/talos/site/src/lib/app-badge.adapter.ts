/** @DependsOnExternal browser-badging */

function ignoreRefusal(): undefined {
  return undefined;
}

// @FollowsBlueprint browser-clipboard-write
export function showAppBadge(count: number): void {
  if (typeof navigator.setAppBadge !== 'function') return;
  navigator.setAppBadge(count).catch(ignoreRefusal);
}
