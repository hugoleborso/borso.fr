import type { RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerOutReason } from '../../lib/runner-status.utils';

const AUTOMATIC_OUT_REASON = 'late';

export interface DidNotFinishLists {
  readonly awaitingConfirmation: readonly RankedRunnerDto[];
  readonly allOut: readonly RankedRunnerDto[];
  readonly stillRunning: readonly RankedRunnerDto[];
}

// @FollowsBlueprint core-view-projection
export function splitByDidNotFinish(ranked: readonly RankedRunnerDto[]): DidNotFinishLists {
  const allOut = ranked.filter((entry) => entry.status.kind === 'dnf');
  return {
    awaitingConfirmation: allOut.filter(
      (entry) => selectRunnerOutReason(entry.status) === AUTOMATIC_OUT_REASON,
    ),
    allOut,
    stillRunning: ranked.filter((entry) => entry.status.kind === 'in-race'),
  };
}

export function selectOutAtLoop(entry: RankedRunnerDto): number {
  if (entry.status.kind === 'dnf') return entry.status.outAtLoop;
  return entry.status.lastLoop;
}

export function selectMissedLoop(entry: RankedRunnerDto): number {
  return selectOutAtLoop(entry) + 1;
}

const REASON_KEY_BY_REASON = {
  manual: 'admin.did-not-finish.reason-manual',
  late: 'admin.did-not-finish.reason-late',
} as const;

export function selectOutReasonKey(
  entry: RankedRunnerDto,
): 'admin.did-not-finish.reason-manual' | 'admin.did-not-finish.reason-late' {
  if (entry.status.kind !== 'dnf') return REASON_KEY_BY_REASON.late;
  return REASON_KEY_BY_REASON[entry.status.reason];
}
