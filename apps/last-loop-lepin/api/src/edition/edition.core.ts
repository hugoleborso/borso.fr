import type { ManualDidNotFinish } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import type { RaceEdition, RaceSnapshot } from './edition.types';

const MILLISECONDS_PER_MINUTE = 60_000;

export function nextHourlyTop(edition: RaceEdition, now: Date): Date | null {
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedMs = now.getTime() - edition.startsAt.getTime();
  const NO_BOUNDARY_BEFORE_THE_START = 0;
  const boundariesPassed = Math.max(
    NO_BOUNDARY_BEFORE_THE_START,
    Math.floor(elapsedMs / intervalMs) + 1,
  );
  const nextBoundaryMs = edition.startsAt.getTime() + boundariesPassed * intervalMs;
  if (nextBoundaryMs >= edition.endsAt.getTime()) return null;
  return new Date(nextBoundaryMs);
}

export function loopIndexAt(edition: RaceEdition, now: Date): number {
  if (now.getTime() <= edition.startsAt.getTime()) return 0;
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedMs = now.getTime() - edition.startsAt.getTime();
  return Math.floor(elapsedMs / intervalMs) + 1;
}

// @FollowsBlueprint core-decision
export function isRaceEndReached(edition: RaceEdition, now: Date): boolean {
  return now.getTime() >= edition.endsAt.getTime();
}

interface DidNotFinishProjection {
  readonly runner: Runner;
  readonly missedAfterLoop: number;
}

// @FollowsBlueprint core-projection
export function projectDidNotFinishCandidates({
  edition,
  runners,
  punches,
  manualDidNotFinishes,
  now,
}: RaceSnapshot): readonly DidNotFinishProjection[] {
  const currentLoop = loopIndexAt(edition, now);
  if (currentLoop <= 1) return [];

  const expectedClosedLoop = currentLoop - 1;
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  const closingTopOfExpectedLoopMs = edition.startsAt.getTime() + expectedClosedLoop * intervalMs;

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
        punch.finishedAt.getTime() <= closingTopOfExpectedLoopMs,
    );
    if (!hasClosedLoop) {
      candidates.push({ runner, missedAfterLoop: expectedClosedLoop });
    }
  }
  return candidates;
}

export function totalHourlyTops(edition: RaceEdition): number {
  const totalMinutes =
    (edition.endsAt.getTime() - edition.startsAt.getTime()) / MILLISECONDS_PER_MINUTE;
  return Math.max(0, Math.floor(totalMinutes / edition.intervalMinutes));
}
