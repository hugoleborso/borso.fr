/**
 * Edition timing — pure helpers around the hourly-top cadence and the
 * race-end cut-off. None of these functions call `new Date()`; the moment
 * of evaluation is always passed as `now: Date`. That makes
 * `vi.setSystemTime()` the only place the test suites need to drive time.
 */

import type { LoopPunch, ManualDidNotFinish } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import type { RaceEdition } from './edition.types';

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * The next hourly-top boundary at or after `now`, or `null` once the race
 * has ended (`now >= edition.endsAt`). Hourly tops are computed from
 * `edition.startsAt` plus multiples of `edition.intervalMinutes`.
 */
export function nextHourlyTop(edition: RaceEdition, now: Date): Date | null {
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedMs = now.getTime() - edition.startsAt.getTime();
  // Clamped at zero so a `now` before the race answers `startsAt`, however
  // far ahead of it the question is asked.
  const boundariesPassed = Math.max(0, Math.floor(elapsedMs / intervalMs) + 1);
  const nextBoundaryMs = edition.startsAt.getTime() + boundariesPassed * intervalMs;
  if (nextBoundaryMs >= edition.endsAt.getTime()) return null;
  return new Date(nextBoundaryMs);
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

interface DidNotFinishProjection {
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
export function projectDidNotFinishCandidates(
  edition: RaceEdition,
  runners: readonly Runner[],
  punches: readonly LoopPunch[],
  manualDidNotFinishes: readonly ManualDidNotFinish[],
  now: Date,
): readonly DidNotFinishProjection[] {
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

  const manualDidNotFinishBySlug = new Map<string, ManualDidNotFinish>();
  for (const didNotFinish of manualDidNotFinishes) {
    manualDidNotFinishBySlug.set(didNotFinish.runnerSlug, didNotFinish);
  }

  const validPunches = punches.filter((punch) => punch.voidedAt === null);

  const candidates: DidNotFinishProjection[] = [];
  for (const runner of runners) {
    if (manualDidNotFinishBySlug.has(runner.slug)) continue;
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
  const totalMinutes =
    (edition.endsAt.getTime() - edition.startsAt.getTime()) / MILLISECONDS_PER_MINUTE;
  return Math.max(0, Math.floor(totalMinutes / edition.intervalMinutes));
}
