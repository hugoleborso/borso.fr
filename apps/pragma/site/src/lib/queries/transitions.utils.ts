/** @Feature transitions */

interface TransitionPair {
  readonly songAId: string;
  readonly songBId: string;
}

function isSamePair(row: TransitionPair, songAId: string, songBId: string): boolean {
  return row.songAId === songAId && row.songBId === songBId;
}

// @FollowsBlueprint utils-pure-module
export function upsertTransitionComment<Row extends TransitionPair>(
  rows: readonly Row[],
  next: Row,
): Row[] {
  const wasPresent = rows.some((row) => isSamePair(row, next.songAId, next.songBId));
  const replaced = rows.map((row) => (isSamePair(row, next.songAId, next.songBId) ? next : row));
  return wasPresent ? replaced : [...replaced, next];
}
