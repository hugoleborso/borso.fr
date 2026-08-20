/** @Feature mastery */

import { type Lineup, memberInstrumentPairs } from '@domain/lineup.core';

export interface MasteryDefaultRow {
  readonly memberId: string;
  readonly instrumentId: string;
  readonly score: number;
}

// @FollowsBlueprint utils-pure-module
export function meanDefaultMasteryForSong(
  defaultLineup: Lineup,
  defaults: readonly MasteryDefaultRow[],
): number | null {
  const lookup = new Map<string, number>();
  for (const row of defaults) {
    lookup.set(`${row.memberId}::${row.instrumentId}`, row.score);
  }
  let sum = 0;
  let count = 0;
  for (const [memberId, instrumentId] of memberInstrumentPairs(defaultLineup)) {
    const score = lookup.get(`${memberId}::${instrumentId}`);
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}
