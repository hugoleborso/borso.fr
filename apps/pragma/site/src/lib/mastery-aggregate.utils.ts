/**
 * Front-end port of the mastery aggregation logic. The API ships
 * `mastery.core.ts` with `meanForSong`, but the front-end can't import
 * across workspaces; this utility mirrors the rule against the same
 * data shape the catalog list endpoint already returns.
 *
 * `meanMasteryForSong` returns the average mastery default across the
 * song's lineup. Members with a null instrument (absent for this song)
 * are skipped. Returns null if the lineup is empty or no defaults are
 * known for any of the (member, instrument) pairs.
 */

export interface MasteryDefaultRow {
  readonly memberId: string;
  readonly instrumentId: string;
  readonly score: number;
}

export function meanMasteryForSong(
  defaultLineup: Readonly<Record<string, string | null>>,
  defaults: readonly MasteryDefaultRow[],
): number | null {
  const lookup = new Map<string, number>();
  for (const row of defaults) {
    lookup.set(`${row.memberId}::${row.instrumentId}`, row.score);
  }
  let sum = 0;
  let count = 0;
  for (const [memberId, instrumentId] of Object.entries(defaultLineup)) {
    if (instrumentId === null) continue;
    const score = lookup.get(`${memberId}::${instrumentId}`);
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}
