import { loopIndexAt } from '../edition/edition.core';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch } from './punch.types';

const MILLISECONDS_PER_MINUTE = 60_000;

export type PunchTimingRejectReason = 'race-not-started' | 'race-finished';

export type PunchRejectReason =
  PunchTimingRejectReason | 'already-punched-this-loop' | 'runner-not-in-race';

export type PunchValidation =
  | { readonly ok: true; readonly loopIndex: number }
  | { readonly ok: false; readonly reason: PunchTimingRejectReason };

/**
 * @Blueprint core-decision
 * @BlueprintName Core Decision Function
 * @BlueprintUsage Use for every business rule that can be decided from values alone. Take the data and `now` as arguments, return a decision, touch nothing else.
 * @BlueprintDescription Decides whether the race window is open and which loop a punch made at an explicit `now` belongs to. It deliberately does not decide whether the runner already holds a punch for that loop: an answer computed from rows read earlier is stale by the time it is written, so that rule lives in the primary key of `loop_punch_claims`. Pure, so its test calls it with values and asserts on values, and it carries the full coverage gate and the zero-survivor mutation gate.
 */
export function validatePunchTiming(edition: RaceEdition, now: Date): PunchValidation {
  if (now.getTime() < edition.startsAt.getTime()) {
    return { ok: false, reason: 'race-not-started' };
  }
  if (now.getTime() > edition.endsAt.getTime()) {
    return { ok: false, reason: 'race-finished' };
  }
  return { ok: true, loopIndex: Math.max(1, loopIndexAt(edition, now)) };
}

export function hourlyTopOfLoopMs(edition: RaceEdition, loopIndex: number): number {
  const intervalMs = edition.intervalMinutes * MILLISECONDS_PER_MINUTE;
  return edition.startsAt.getTime() + (loopIndex - 1) * intervalMs;
}

export function loopDurationMs(edition: RaceEdition, punch: LoopPunch): number | null {
  const elapsedSinceOwnHourlyTop =
    punch.finishedAt.getTime() - hourlyTopOfLoopMs(edition, punch.loopIndex);
  return elapsedSinceOwnHourlyTop >= 0 ? elapsedSinceOwnHourlyTop : null;
}

export function lastLoopDurationMs(
  edition: RaceEdition,
  runnerSlug: string,
  punches: readonly LoopPunch[],
): number | null {
  const punchesInLoopOrder = punches
    .filter((punch) => punch.runnerSlug === runnerSlug && punch.voidedAt === null)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
  const deepestPunch = punchesInLoopOrder.at(-1);

  if (deepestPunch === undefined) return null;
  return loopDurationMs(edition, deepestPunch);
}
