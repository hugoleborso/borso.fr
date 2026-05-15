/**
 * Fastest-lap projection — pure.
 *
 * Iterates over every non-voided punch, computes its loop duration with
 * `loopDurationMs` (the same formula as `lastLoopDurationMs`, defined
 * exactly once in `punch.core.ts`), and surfaces the runner(s) holding
 * the edition's minimum.
 *
 * The result is the *edition record*, not "fastest among in-race"
 * runners — a runner who set the fastest lap then DNF-ed keeps their
 * entry as long as their punch survives in the table. DNF logic lives
 * upstream in `ranking.core.ts`; this projection never consults a
 * `ManualDnf`.
 */

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

/**
 * Find the runner(s) with the minimal loop duration across all valid
 * punches. Duration uses the same formula as `lastLoopDurationMs`:
 * `finishedAt − (startsAt + (loopIndex − 1) × intervalMs)`.
 *
 * Returns an empty array when no punch is recorded, when every punch is
 * voided, or when every duration is `null` (clock-skew degenerate). A
 * length ≥ 2 result indicates a tie at the millisecond across distinct
 * runners. If a single runner has two punches at the same minimum, they
 * appear once (deduplication by `runnerSlug` — only the slug matters
 * downstream for chip decoration).
 */
export function fastestLap(
  edition: RaceEdition,
  punches: readonly LoopPunch[],
): ReadonlyArray<FastestLapEntry> {
  const candidates: CandidateEntry[] = [];
  for (const punch of punches) {
    if (punch.voidedAt !== null) continue;
    const duration = loopDurationMs(edition, punch);
    if (duration === null) continue;
    candidates.push({ runnerSlug: punch.runnerSlug, durationMs: duration });
  }
  if (candidates.length === 0) return [];

  const minimum = candidates.reduce(
    (current, candidate) => (candidate.durationMs < current ? candidate.durationMs : current),
    Number.POSITIVE_INFINITY,
  );

  const seenSlugs = new Set<string>();
  const result: FastestLapEntry[] = [];
  for (const candidate of candidates) {
    if (candidate.durationMs !== minimum) continue;
    if (seenSlugs.has(candidate.runnerSlug)) continue;
    seenSlugs.add(candidate.runnerSlug);
    result.push({ runnerSlug: candidate.runnerSlug, durationMs: candidate.durationMs });
  }
  return result;
}
