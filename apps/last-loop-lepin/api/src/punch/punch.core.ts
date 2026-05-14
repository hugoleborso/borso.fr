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
 * Time the runner spent on their last completed loop, in milliseconds.
 *
 * Backyard rule: every loop starts on the top of the hour. A runner who
 * clears their loop early waits at the corral until the next top, then
 * starts again with everyone. So the actually-meaningful loop time is
 *
 *   punch.finishedAt − (startsAt + (loopIndex − 1) × intervalMs)
 *
 * not the wall-clock gap between two consecutive punches (which counts
 * the corral rest period too).
 *
 * Returns `null` when the runner has no punch yet or when their last
 * punch lands before the loop's top-of-hour boundary (clock skew /
 * pre-race punches recorded for testing).
 */
export function lastLoopDurationMs(
  edition: RaceEdition,
  runnerSlug: string,
  validPunchesForRunner: readonly LoopPunch[],
): number | null {
  // `reduce` carries the last-seen punch without ever indexing into the
  // array — sidesteps `noUncheckedIndexedAccess` and the closure-capture
  // narrowing limit on `forEach` with mutable locals.
  const lastPunch = validPunchesForRunner
    .filter((punch) => punch.runnerSlug === runnerSlug)
    .toSorted((left, right) => left.loopIndex - right.loopIndex)
    .reduce<LoopPunch | null>((_, punch) => punch, null);

  if (lastPunch === null) return null;
  const intervalMs = edition.intervalMinutes * 60_000;
  const loopStartMs = edition.startsAt.getTime() + (lastPunch.loopIndex - 1) * intervalMs;
  const elapsed = lastPunch.finishedAt.getTime() - loopStartMs;
  return elapsed >= 0 ? elapsed : null;
}

