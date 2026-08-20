/** @Feature mastery */

interface MasteryCell {
  readonly memberId: string;
  readonly instrumentId: string;
}

function isSameCell(row: MasteryCell, memberId: string, instrumentId: string): boolean {
  return row.memberId === memberId && row.instrumentId === instrumentId;
}

// @FollowsBlueprint utils-pure-module
export function upsertMasteryDefault<Row extends MasteryCell>(
  rows: readonly Row[],
  next: Row,
): Row[] {
  const replaced = rows.map((row) =>
    isSameCell(row, next.memberId, next.instrumentId) ? next : row,
  );
  const wasReplaced = rows.some((row) => isSameCell(row, next.memberId, next.instrumentId));
  return wasReplaced ? replaced : [...replaced, next];
}

export function withoutMasteryDefault<Row extends MasteryCell>(
  rows: readonly Row[],
  memberId: string,
  instrumentId: string,
): Row[] {
  return rows.filter((row) => !isSameCell(row, memberId, instrumentId));
}
