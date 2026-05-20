/**
 * Pure helpers for the mastery matrix UI on /members. Per spec use
 * case 1bis: row averages = per-member overall musicianship, column
 * averages = per-instrument bench strength. Both compute live as the
 * matrix is edited.
 */

export interface CellKey {
  readonly memberId: string;
  readonly instrumentId: string;
}

export function cellKey(memberId: string, instrumentId: string): string {
  return `${memberId}/${instrumentId}`;
}

/**
 * Average mastery for a single member across every instrument that
 * has a score. Cells without a score are skipped (they're treated as
 * "no opinion logged", not "zero"). Returns null when the row is
 * empty.
 */
export function rowAverage(
  memberId: string,
  instrumentIds: readonly string[],
  scores: Readonly<Record<string, number>>,
): number | null {
  let sum = 0;
  let count = 0;
  for (const instrumentId of instrumentIds) {
    const score = scores[cellKey(memberId, instrumentId)];
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

/**
 * Average mastery for a single instrument across every member that
 * has a score. Symmetric to `rowAverage`.
 */
export function columnAverage(
  instrumentId: string,
  memberIds: readonly string[],
  scores: Readonly<Record<string, number>>,
): number | null {
  let sum = 0;
  let count = 0;
  for (const memberId of memberIds) {
    const score = scores[cellKey(memberId, instrumentId)];
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

/**
 * Clamps the proposed score into [0, 10]. Used by scroll-wheel ±1
 * (which can take a score past either bound).
 */
export const MASTERY_SCORE_MIN = 0;
export const MASTERY_SCORE_MAX = 10;

export function clampScore(value: number): number {
  if (value < MASTERY_SCORE_MIN) return MASTERY_SCORE_MIN;
  if (value > MASTERY_SCORE_MAX) return MASTERY_SCORE_MAX;
  return Math.round(value);
}
