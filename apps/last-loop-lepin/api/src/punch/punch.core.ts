/**
 * Loop-punching rules — pure. No `new Date()`; `now` is always a parameter.
 *
 * `validatePunchTiming` is the single place that decides whether a punch
 * is acceptable for a given runner at a given moment. The service layer
 * then writes the row only if the validation returned `ok: true`.
 */

import { loopIndexAt } from '../edition/edition.core';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch } from './punch.types';

const TOLERANCE_SECONDS_AT_TOP = 30;

export type PunchValidation =
  | { readonly ok: true; readonly loopIndex: number }
  | { readonly ok: false; readonly reason: PunchRejectReason };

export type PunchRejectReason =
  | 'race-not-started'
  | 'race-finished'
  | 'already-punched-this-loop'
  | 'runner-not-in-race';

/**
 * Decide whether a punch at `now` should be accepted for `runnerSlug`.
 * Returns `{ ok: true, loopIndex }` (1-based) on success.
 */
export function validatePunchTiming(
  edition: RaceEdition,
  runnerSlug: string,
  validPunchesForRunner: readonly LoopPunch[],
  now: Date,
): PunchValidation {
  if (now.getTime() < edition.startsAt.getTime()) {
    return { ok: false, reason: 'race-not-started' };
  }
  if (now.getTime() > edition.endsAt.getTime()) {
    return { ok: false, reason: 'race-finished' };
  }

  const currentLoopFloor = loopIndexAt(edition, now);
  const targetLoop = Math.max(1, currentLoopFloor);

  const conflict = validPunchesForRunner.some(
    (punch) => punch.runnerSlug === runnerSlug && punch.loopIndex === targetLoop,
  );
  if (conflict) {
    return { ok: false, reason: 'already-punched-this-loop' };
  }

  return { ok: true, loopIndex: targetLoop };
}

/**
 * Duration of the last completed loop for a runner, in milliseconds.
 * Returns `null` when the runner has not punched at least one loop, or
 * when their first punch precedes `edition.startsAt`.
 */
export function lastLoopDurationMs(
  edition: RaceEdition,
  runnerSlug: string,
  validPunchesForRunner: readonly LoopPunch[],
): number | null {
  // `reduce` carries the last-seen punch and the one before it without ever
  // indexing into the array — sidesteps `noUncheckedIndexedAccess` and the
  // closure-capture narrowing limit on `forEach` with mutable locals.
  const trace = validPunchesForRunner
    .filter((punch) => punch.runnerSlug === runnerSlug)
    .toSorted((left, right) => left.loopIndex - right.loopIndex)
    .reduce<{ last: LoopPunch | null; previous: LoopPunch | null }>(
      (accumulator, punch) => ({ last: punch, previous: accumulator.last }),
      { last: null, previous: null },
    );

  if (trace.last === null) return null;
  if (trace.previous === null) {
    const fromStart = trace.last.finishedAt.getTime() - edition.startsAt.getTime();
    return fromStart >= 0 ? fromStart : null;
  }
  return trace.last.finishedAt.getTime() - trace.previous.finishedAt.getTime();
}

export const PUNCH_CONSTANTS = {
  TOLERANCE_SECONDS_AT_TOP,
} as const;
