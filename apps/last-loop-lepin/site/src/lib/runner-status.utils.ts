/**
 * Reads the two things every screen wants from a runner's status: whether
 * they are still running, and which loop the status refers to. Keeping the
 * discrimination here means no component repeats it.
 */

import type { RankedRunnerDto, RunnerStatusDto } from './race.types';

export type RunnerStatusKind = 'in-race' | 'out';

export function selectRunnerStatusKind(status: RunnerStatusDto): RunnerStatusKind {
  return status.kind === 'in-race' ? 'in-race' : 'out';
}

/** Last closed loop for a runner still going, or the loop they went out on. */
export function selectRunnerStatusLoop(status: RunnerStatusDto): number {
  return status.kind === 'in-race' ? status.lastLoop : status.outAtLoop;
}

/** Why a runner is out, defaulting to the automatic reason for one still in. */
export function selectRunnerOutReason(status: RunnerStatusDto): 'late' | 'manual' {
  return status.kind === 'dnf' ? status.reason : 'late';
}

/** How many runners are still in the race, which several screens show as a count. */
export function countRunnersInRace(ranked: readonly RankedRunnerDto[]): number {
  return ranked.filter((entry) => entry.status.kind === 'in-race').length;
}
