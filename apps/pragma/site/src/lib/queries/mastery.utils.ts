/**
 * The two edits an optimistic mastery write makes to the cached default
 * scores. A default is identified by the member and instrument pair, so both
 * functions match on that pair and neither cares what else a row carries.
 *
 * Generic over the row so the caller keeps whatever shape the API returned.
 */

interface MasteryCell {
  readonly memberId: string;
  readonly instrumentId: string;
}

function isSameCell(row: MasteryCell, memberId: string, instrumentId: string): boolean {
  return row.memberId === memberId && row.instrumentId === instrumentId;
}

/** The rows with `next` replacing the row for the same cell, or appended. */
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

/** The rows without the one for this cell. */
export function withoutMasteryDefault<Row extends MasteryCell>(
  rows: readonly Row[],
  memberId: string,
  instrumentId: string,
): Row[] {
  return rows.filter((row) => !isSameCell(row, memberId, instrumentId));
}
