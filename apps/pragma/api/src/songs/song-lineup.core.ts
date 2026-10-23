export type LineupByMember = Readonly<Record<string, readonly string[]>>;

function hasSameInstruments(
  previous: readonly string[] | undefined,
  next: readonly string[] | undefined,
): boolean {
  if (previous === undefined || next === undefined) return false;
  return (
    previous.length === next.length &&
    previous.every((instrument, index) => instrument === next[index])
  );
}

// @FollowsBlueprint core-decision
export function hasLineupChanged(previous: LineupByMember, next: LineupByMember): boolean {
  const memberIds = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...memberIds].some((memberId) => !hasSameInstruments(previous[memberId], next[memberId]));
}
