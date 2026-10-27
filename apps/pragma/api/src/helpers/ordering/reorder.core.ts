// @FollowsBlueprint helper-module
export function isReorderOfTheSameIds(
  currentIds: readonly string[],
  requestedIds: readonly string[],
): boolean {
  const current = new Set(currentIds);
  const requested = new Set(requestedIds);
  const isSameSize = requested.size === requestedIds.length && requested.size === current.size;
  return isSameSize && requestedIds.every((id) => current.has(id));
}
