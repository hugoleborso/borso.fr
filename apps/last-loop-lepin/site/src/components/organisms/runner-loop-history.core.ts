/**
 * The runner profile's loop table. A loop's duration is the gap between the
 * previous closed loop and this one, with the race start standing in for the
 * loop before the first, and cancelled punches left out entirely.
 */

import type { LoopPunchDto } from '../../lib/race.types';

export interface ClosedLoop {
  readonly loopIndex: number;
  readonly finishedAt: string;
  readonly durationMs: number;
}

export function listClosedLoops(
  raceStartIso: string | undefined,
  punches: readonly LoopPunchDto[],
): readonly ClosedLoop[] {
  const valid = punches
    .filter((punch) => punch.voidedAt === null)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
  let previousMs = raceStartIso === undefined ? 0 : new Date(raceStartIso).getTime();
  const loops: ClosedLoop[] = [];
  for (const punch of valid) {
    const finishedMs = new Date(punch.finishedAt).getTime();
    loops.push({
      loopIndex: punch.loopIndex,
      finishedAt: punch.finishedAt,
      durationMs: finishedMs - previousMs,
    });
    previousMs = finishedMs;
  }
  return loops;
}

/** How many punches of a runner are still valid, shown next to their name. */
export function countValidPunches(punches: readonly LoopPunchDto[]): number {
  return punches.filter((punch) => punch.voidedAt === null).length;
}
