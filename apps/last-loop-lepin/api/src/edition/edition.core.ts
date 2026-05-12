/**
 * Edition timing — pure helpers around the hourly-top cadence and the
 * race-end cut-off. None of these functions call `new Date()`; the moment
 * of evaluation is always passed as `now: Date`. That makes
 * `vi.setSystemTime()` the only place the test suites need to drive time.
 */

import type { LoopPunch, ManualDnf } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import type { RaceEdition } from './edition.types';

const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;
const TOLERANCE_SECONDS_AT_TOP = 30;

/**
 * The next hourly-top boundary at or after `now`, or `null` once the race
 * has ended (`now >= edition.endsAt`). Hourly tops are computed from
 * `edition.startsAt` plus multiples of `edition.intervalMinutes`.
 */
export function nextHourlyTop(edition: RaceEdition, now: Date): Date | null {
  if (now.getTime() >= edition.endsAt.getTime()) return null;

  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedMs = now.getTime() - edition.startsAt.getTime();
  if (elapsedMs < 0) return new Date(edition.startsAt.getTime());

  const loopsElapsed = Math.floor(elapsedMs / intervalMs);
  const nextBoundary = edition.startsAt.getTime() + (loopsElapsed + 1) * intervalMs;
  if (nextBoundary >= edition.endsAt.getTime()) return null;
  return new Date(nextBoundary);
}

/**
 * The 1-based loop index `now` falls into. Returns `0` before the race
 * starts and the final loop index after `endsAt`.
 */
export function loopIndexAt(edition: RaceEdition, now: Date): number {
  if (now.getTime() <= edition.startsAt.getTime()) return 0;
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedMs = now.getTime() - edition.startsAt.getTime();
  return Math.floor(elapsedMs / intervalMs) + 1;
}

/** True iff `now` is past the race's cut-off. */
export function isRaceEndReached(edition: RaceEdition, now: Date): boolean {
  return now.getTime() >= edition.endsAt.getTime();
}

interface DnfProjection {
  readonly runner: Runner;
  readonly missedAfterLoop: number;
}

/**
 * Runners who have not punched the loop that just closed at the most-recent
 * hourly top. The orga validates these one by one — semi-auto, not auto.
 *
 * A runner is a candidate iff (a) they are not already DNF, (b) the current
 * moment is at or past the top of loop N+1 (where N is their expected
 * already-punched loop), (c) they have no valid (non-voided) punch for
 * loop N.
 */
export function projectDnfCandidates(
  edition: RaceEdition,
  runners: readonly Runner[],
  punches: readonly LoopPunch[],
  manualDnfs: readonly ManualDnf[],
  now: Date,
): readonly DnfProjection[] {
  const currentLoop = loopIndexAt(edition, now);
  if (currentLoop <= 1) return [];

  const expectedClosedLoop = currentLoop - 1;
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  // A loop closes at the top of the next hourly boundary. A punch counts
  // for `expectedClosedLoop` if it landed at or before that boundary; the
  // ±30s human tolerance is documented in the spec but is only about not
  // contesting punches in the last seconds before the top — it does not
  // extend the deadline past the top itself.
  const closingTimeMs = edition.startsAt.getTime() + expectedClosedLoop * intervalMs;

  const dnfBySlug = new Map<string, ManualDnf>();
  for (const dnf of manualDnfs) dnfBySlug.set(dnf.runnerSlug, dnf);

  const validPunches = punches.filter((punch) => punch.voidedAt === null);

  const candidates: DnfProjection[] = [];
  for (const runner of runners) {
    if (dnfBySlug.has(runner.slug)) continue;
    const hasClosedLoop = validPunches.some(
      (punch) =>
        punch.runnerSlug === runner.slug &&
        punch.loopIndex === expectedClosedLoop &&
        punch.finishedAt.getTime() <= closingTimeMs,
    );
    if (!hasClosedLoop) {
      candidates.push({ runner, missedAfterLoop: expectedClosedLoop });
    }
  }
  return candidates;
}

/** Convenience: total hourly-top boundaries between `startsAt` and `endsAt`. */
export function totalHourlyTops(edition: RaceEdition): number {
  const totalMinutes = (edition.endsAt.getTime() - edition.startsAt.getTime()) / MILLISECONDS_PER_MINUTE;
  return Math.max(0, Math.floor(totalMinutes / edition.intervalMinutes));
}

export const EDITION_TIMING_CONSTANTS = {
  MILLISECONDS_PER_MINUTE,
  SECONDS_PER_MINUTE,
  TOLERANCE_SECONDS_AT_TOP,
} as const;
