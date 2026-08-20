import type { RankedRunnerDto, RunnerStatusDto } from './race.types';

export type RunnerStatusKind = 'in-race' | 'out';

// @FollowsBlueprint core-view-intent
export function selectRunnerStatusKind(status: RunnerStatusDto): RunnerStatusKind {
  return status.kind === 'in-race' ? 'in-race' : 'out';
}

export function selectRunnerStatusLoop(status: RunnerStatusDto): number {
  return status.kind === 'in-race' ? status.lastLoop : status.outAtLoop;
}

export function selectRunnerOutReason(status: RunnerStatusDto): 'late' | 'manual' {
  return status.kind === 'dnf' ? status.reason : 'late';
}

export function countRunnersInRace(ranked: readonly RankedRunnerDto[]): number {
  return ranked.filter((entry) => entry.status.kind === 'in-race').length;
}
