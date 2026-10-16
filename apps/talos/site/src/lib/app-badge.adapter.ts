/** @DependsOnExternal browser-badging */

// @FollowsBlueprint browser-clipboard-write
export async function showAppBadge(count: number): Promise<void> {
  if (typeof navigator.setAppBadge !== 'function') return;
  await navigator.setAppBadge(count);
}
