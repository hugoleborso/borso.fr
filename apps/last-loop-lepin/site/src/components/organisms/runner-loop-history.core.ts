import type { LoopPunchDto } from '../../lib/race.types';

export interface ClosedLoop {
  readonly loopIndex: number;
  readonly finishedAt: string;
  readonly durationMs: number;
}

// @FollowsBlueprint core-view-projection
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

export function countValidPunches(punches: readonly LoopPunchDto[]): number {
  return punches.filter((punch) => punch.voidedAt === null).length;
}
