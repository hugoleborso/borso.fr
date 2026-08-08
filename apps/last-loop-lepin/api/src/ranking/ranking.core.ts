/**
 * Ranking — pure. `now: Date` is always a parameter.
 *
 * Rules of the format ("backyard qui a une fin"):
 * - A runner is "in-race" iff they have a valid punch for every closed
 *   loop since the start, AND they are not manually marked DNF.
 * - The race ends when (a) `now >= edition.endsAt` (hard cut-off) or
 *   (b) at most one runner is still in-race.
 * - Tie-break: deepest reached loop wins. Within the same loop, earlier
 *   finishing time wins. Identical loop and identical millisecond finish
 *   time → both runners share `rank: 'ex-aequo'`.
 * - Order: in-race runners precede DNFs; within each tier the sort is
 *   loop-depth descending then finish-time ascending.
 */

import { isRaceEndReached, loopIndexAt, totalHourlyTops } from '../edition/edition.core';
import type { RaceEdition } from '../edition/edition.types';
import { lastLoopDurationMs } from '../punch/punch.core';
import type { LoopPunch, ManualDidNotFinish } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import { fastestLap } from './fastest-lap.core';
import type { RankedRunner, RunnerStatus, Standings } from './ranking.types';

interface RunnerProgress {
  readonly runner: Runner;
  readonly lastValidLoop: number;
  readonly lastFinishedAt: Date | null;
  readonly status: RunnerStatus;
}

function progressFor(
  runner: Runner,
  punches: readonly LoopPunch[],
  manualDidNotFinish: ManualDidNotFinish | undefined,
  expectedClosedLoop: number,
): RunnerProgress {
  const sorted = punches
    .filter((punch) => punch.runnerSlug === runner.slug && punch.voidedAt === null)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);

  let lastValidLoop = 0;
  for (const punch of sorted) {
    if (punch.loopIndex === lastValidLoop + 1) {
      lastValidLoop = punch.loopIndex;
    }
  }

  const lastPunch = sorted[sorted.length - 1];
  const lastFinishedAt = lastPunch?.finishedAt ?? null;

  if (manualDidNotFinish !== undefined) {
    return {
      runner,
      lastValidLoop,
      lastFinishedAt,
      status: {
        kind: 'dnf',
        outAtLoop: manualDidNotFinish.outAtLoop,
        reason: manualDidNotFinish.reason,
      },
    };
  }

  if (lastValidLoop < expectedClosedLoop) {
    return {
      runner,
      lastValidLoop,
      lastFinishedAt,
      status: { kind: 'dnf', outAtLoop: lastValidLoop, reason: 'late' },
    };
  }

  return {
    runner,
    lastValidLoop,
    lastFinishedAt,
    status: { kind: 'in-race', lastLoop: lastValidLoop },
  };
}

function compareProgresses(left: RunnerProgress, right: RunnerProgress): number {
  const isLeftIsInRace = left.status.kind === 'in-race';
  const isRightIsInRace = right.status.kind === 'in-race';
  if (isLeftIsInRace !== isRightIsInRace) return isLeftIsInRace ? -1 : 1;
  if (left.lastValidLoop !== right.lastValidLoop) {
    return right.lastValidLoop - left.lastValidLoop;
  }
  const leftTime = left.lastFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = right.lastFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return leftTime - rightTime;
}

function areTiedForRanking(left: RunnerProgress, right: RunnerProgress): boolean {
  if (left.status.kind !== right.status.kind) return false;
  if (left.lastValidLoop !== right.lastValidLoop) return false;
  const leftMs = left.lastFinishedAt?.getTime() ?? null;
  const rightMs = right.lastFinishedAt?.getTime() ?? null;
  return leftMs === rightMs;
}

/**
 * Compute the ranked standings of every runner at moment `now`.
 *
 * In-race runners precede DNFs. Within each tier, the deeper loop ranks
 * higher; identical loop counts break by earliest finish time. Identical
 * loop AND identical finish ms → both runners receive `rank: 'ex-aequo'`.
 */
export function computeStandings(
  edition: RaceEdition,
  runners: readonly Runner[],
  punches: readonly LoopPunch[],
  manualDidNotFinishes: readonly ManualDidNotFinish[],
  now: Date,
): Standings {
  const manualDidNotFinishesBySlug = new Map<string, ManualDidNotFinish>();
  for (const didNotFinish of manualDidNotFinishes)
    manualDidNotFinishesBySlug.set(didNotFinish.runnerSlug, didNotFinish);

  const validPunches = punches.filter((punch) => punch.voidedAt === null);
  // `loopIndexAt` keeps growing linearly past `endsAt` — for a 15-loop
  // race viewed two days later it returns ~70, which would silently flip
  // every finisher to `dnf reason='late'` (their `lastValidLoop` of 15 is
  // less than the bogus expected 69). The race has a fixed number of
  // loops, so the expectation has to cap there.
  const expectedClosedLoop = Math.min(
    totalHourlyTops(edition),
    Math.max(0, loopIndexAt(edition, now) - 1),
  );

  const progresses = runners
    .map((runner) =>
      progressFor(
        runner,
        validPunches,
        manualDidNotFinishesBySlug.get(runner.slug),
        expectedClosedLoop,
      ),
    )
    .toSorted(compareProgresses);

  // `reduce` over progresses to build the ranked list while carrying the
  // previous progress + index of its pushed entry. Avoids array index access
  // and the defensive-undefined branches that `noUncheckedIndexedAccess`
  // otherwise forces on every for-loop iteration.
  interface RankAccumulator {
    readonly ranked: readonly RankedRunner[];
    readonly previous: { progress: RunnerProgress; index: number } | null;
    readonly currentRank: number;
  }

  const result = progresses.reduce<RankAccumulator>(
    (accumulator, progress) => {
      const isTied =
        accumulator.previous !== null && areTiedForRanking(accumulator.previous.progress, progress);
      const assignedRank: number | 'ex-aequo' = isTied ? 'ex-aequo' : accumulator.currentRank + 1;
      const nextRank = isTied ? accumulator.currentRank : accumulator.currentRank + 1;

      const newEntry: RankedRunner = {
        runner: progress.runner,
        rank: assignedRank,
        status: progress.status,
        lastLoopDurationMs: lastLoopDurationMs(edition, progress.runner.slug, validPunches),
        lastFinishedAt: progress.lastFinishedAt,
      };

      const updatedRanked = isTied
        ? accumulator.ranked.map((entry, index) =>
            index === accumulator.previous?.index ? { ...entry, rank: 'ex-aequo' as const } : entry,
          )
        : accumulator.ranked;

      return {
        ranked: [...updatedRanked, newEntry],
        previous: { progress, index: updatedRanked.length },
        currentRank: nextRank,
      };
    },
    { ranked: [], previous: null, currentRank: 0 },
  );

  const ranked = result.ranked;

  const inRaceCount = progresses.filter((entry) => entry.status.kind === 'in-race').length;
  return {
    editionSlug: edition.slug,
    computedAt: now,
    raceEnded: isRaceEndReached(edition, now) || inRaceCount <= 1,
    ranked,
    fastestLap: fastestLap(edition, validPunches),
  };
}

export function mostRecentCorrectionAt(punches: readonly LoopPunch[]): Date | null {
  return punches.reduce<Date | null>((accumulator, punch) => {
    const candidates: Date[] = [];
    if (punch.correctedAt !== null) candidates.push(punch.correctedAt);
    if (punch.voidedAt !== null) candidates.push(punch.voidedAt);
    return candidates.reduce<Date | null>(
      (inner, candidate) =>
        inner === null || candidate.getTime() > inner.getTime() ? candidate : inner,
      accumulator,
    );
  }, null);
}

const CSV_HEADER =
  'rank,bib,runner_slug,display_name,status,out_at_loop,last_loop,last_finished_at';

function csvQuote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatStandingsRow(entry: Standings['ranked'][number]): string {
  const status = entry.status.kind;
  const outAtLoop = entry.status.kind === 'dnf' ? entry.status.outAtLoop : '';
  const lastLoop = entry.status.kind === 'in-race' ? entry.status.lastLoop : '';
  const finishedIso = entry.lastFinishedAt?.toISOString() ?? '';
  return [
    entry.rank === 'ex-aequo' ? 'ex-aequo' : `${entry.rank}`,
    entry.runner.bib ?? '',
    entry.runner.slug,
    csvQuote(entry.runner.displayName),
    status,
    outAtLoop,
    lastLoop,
    finishedIso,
  ].join(',');
}

export function formatStandingsAsCsv(standings: Standings): string {
  const lines = standings.ranked.map(formatStandingsRow);
  return `${CSV_HEADER}\n${lines.join('\n')}\n`;
}
