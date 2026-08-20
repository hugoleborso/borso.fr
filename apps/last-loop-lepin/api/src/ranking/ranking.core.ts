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
  validPunches: readonly LoopPunch[],
  manualDidNotFinish: ManualDidNotFinish | undefined,
  expectedClosedLoop: number,
): RunnerProgress {
  const sorted = validPunches
    .filter((punch) => punch.runnerSlug === runner.slug)
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

function deepestLoopExpectedClosed(edition: RaceEdition, now: Date): number {
  const loopsTheEditionCanHold = totalHourlyTops(edition);
  const loopsClosedSoFar = Math.max(0, loopIndexAt(edition, now) - 1);
  return Math.min(loopsTheEditionCanHold, loopsClosedSoFar);
}

interface RankAccumulator {
  readonly ranked: readonly RankedRunner[];
  readonly previous: RunnerProgress | null;
  readonly currentRank: number;
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

// @FollowsBlueprint core-projection
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
  const expectedClosedLoop = deepestLoopExpectedClosed(edition, now);

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

  const rankingPass = progresses.reduce<RankAccumulator>(
    (accumulator, progress) => {
      const isTied =
        accumulator.previous !== null && areTiedForRanking(accumulator.previous, progress);
      const assignedRank: number | 'ex-aequo' = isTied ? 'ex-aequo' : accumulator.currentRank + 1;
      const nextRank = isTied ? accumulator.currentRank : accumulator.currentRank + 1;

      const newEntry: RankedRunner = {
        runner: progress.runner,
        rank: assignedRank,
        status: progress.status,
        lastLoopDurationMs: lastLoopDurationMs(edition, progress.runner.slug, validPunches),
        lastFinishedAt: progress.lastFinishedAt,
      };

      const tiedEntryIndex = accumulator.ranked.length - 1;
      const updatedRanked = isTied
        ? accumulator.ranked.map((entry, index) =>
            index === tiedEntryIndex ? { ...entry, rank: 'ex-aequo' as const } : entry,
          )
        : accumulator.ranked;

      return {
        ranked: [...updatedRanked, newEntry],
        previous: progress,
        currentRank: nextRank,
      };
    },
    { ranked: [], previous: null, currentRank: 0 },
  );

  const ranked = rankingPass.ranked;

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
  const amendmentsMs = punches
    .flatMap((punch) => [punch.correctedAt, punch.voidedAt])
    .filter((instant): instant is Date => instant !== null)
    .map((instant) => instant.getTime());
  const latestMs = amendmentsMs.reduce(
    (latest, current) => Math.max(latest, current),
    Number.NEGATIVE_INFINITY,
  );
  return Number.isFinite(latestMs) ? new Date(latestMs) : null;
}

const CSV_HEADER =
  'rank,bib,runner_slug,display_name,status,out_at_loop,last_loop,last_finished_at';

function csvQuote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatStandingsRow(entry: Standings['ranked'][number]): string {
  const status = entry.status.kind;
  const outAtLoop = entry.status.kind === 'dnf' ? `${entry.status.outAtLoop}` : '';
  const lastLoop = entry.status.kind === 'in-race' ? `${entry.status.lastLoop}` : '';
  const finishedIso = entry.lastFinishedAt?.toISOString() ?? '';
  return [
    `${entry.rank}`,
    entry.runner.bib ?? '',
    entry.runner.slug,
    csvQuote(entry.runner.displayName),
    status,
    outAtLoop,
    lastLoop,
    finishedIso,
  ].join(',');
}

// @FollowsBlueprint core-serializer
export function formatStandingsAsCsv(standings: Standings): string {
  const lines = standings.ranked.map(formatStandingsRow);
  return `${CSV_HEADER}\n${lines.join('\n')}\n`;
}
