/**
 * The three lists the out tab shows, and the loop each action targets.
 *
 * A runner the system projected as out on a missed top of hour is not locked
 * in yet, so a late punch can still bring them back; confirming writes the
 * manual record that stops the projection flipping. Reinstating credits the
 * loop they missed, which is the loop after the one they went out on.
 */

import type { RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerOutReason } from '../../lib/runner-status.utils';

/** The reason the projection assigns on its own, before an organiser confirms. */
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

/** The loop a runner is recorded as out on, when the organiser confirms it. */
export function selectOutAtLoop(entry: RankedRunnerDto): number {
  if (entry.status.kind === 'dnf') return entry.status.outAtLoop;
  return entry.status.lastLoop;
}

/** The loop a reinstated runner is credited with, which is the one they missed. */
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
