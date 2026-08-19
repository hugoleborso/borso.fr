/**
 * The average mastery a song's default lineup holds, from the defaults alone.
 *
 * The name says `Default` because that is the whole difference from the back
 * end's `meanForSong` in `api/src/mastery/mastery.core.ts`, which averages the
 * *effective* score, meaning the per-song override where one exists and the
 * default otherwise. The two therefore disagree on any song that carries an
 * override. This one reads what the catalog list endpoint ships, which is
 * defaults only.
 *
 * One score per instrument held, so a member on drums and vocals counts twice.
 * Members sitting the song out are skipped. Null when the lineup is empty or
 * nothing is known about any of its pairs.
 * @Feature mastery
 */

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
