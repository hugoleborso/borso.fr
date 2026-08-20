import type { RaceEdition } from '../edition/edition.types';
import { loopDurationMs } from '../punch/punch.core';
import type { LoopPunch } from '../punch/punch.types';

export interface FastestLapEntry {
  readonly runnerSlug: string;
  readonly durationMs: number;
}

interface CandidateEntry {
  readonly runnerSlug: string;
  readonly durationMs: number;
}

// @FollowsBlueprint core-projection
export function fastestLap(
  edition: RaceEdition,
  punches: readonly LoopPunch[],
): readonly FastestLapEntry[] {
  const candidates = punches
    .filter((punch) => punch.voidedAt === null)
    .map((punch) => ({
      runnerSlug: punch.runnerSlug,
      durationMs: loopDurationMs(edition, punch),
    }))
    .filter((candidate): candidate is CandidateEntry => candidate.durationMs !== null);

  const minimumDurationMs = candidates.reduce(
    (current, candidate) => Math.min(current, candidate.durationMs),
    Number.POSITIVE_INFINITY,
  );

  const seenSlugs = new Set<string>();
  const laps: FastestLapEntry[] = [];
  for (const candidate of candidates) {
    if (candidate.durationMs !== minimumDurationMs) continue;
    if (seenSlugs.has(candidate.runnerSlug)) continue;
    seenSlugs.add(candidate.runnerSlug);
    laps.push({ runnerSlug: candidate.runnerSlug, durationMs: candidate.durationMs });
  }
  return laps;
}
