import { loopIndexAt } from '../edition/edition.core';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch } from './punch.types';

const MILLISECONDS_PER_MINUTE = 60_000;

export type PunchValidation =
  | { readonly ok: true; readonly loopIndex: number }
  | { readonly ok: false; readonly reason: PunchRejectReason };

export type PunchRejectReason =
  'race-not-started' | 'race-finished' | 'already-punched-this-loop' | 'runner-not-in-race';

/**
 * @Blueprint core-decision
 * @BlueprintName Core Decision Function
 * @BlueprintUsage Use for every business rule. Take the data and `now` as arguments, return a decision, touch nothing else.
 * @BlueprintDescription Decides whether a punch is acceptable from the runner's existing punches, the edition, and an explicit `now`. Pure, so its test calls it with values and asserts on values, and it carries the full coverage gate and the zero-survivor mutation gate.
 */
export interface PunchTimingRequest {
  readonly edition: RaceEdition;
  readonly runnerSlug: string;
  readonly validPunchesForRunner: readonly LoopPunch[];
  readonly now: Date;
}

export function validatePunchTiming({
  edition,
  runnerSlug,
  validPunchesForRunner,
  now,
}: PunchTimingRequest): PunchValidation {
  if (now.getTime() < edition.startsAt.getTime()) {
    return { ok: false, reason: 'race-not-started' };
  }
  if (now.getTime() > edition.endsAt.getTime()) {
    return { ok: false, reason: 'race-finished' };
  }

  const currentLoopFloor = loopIndexAt(edition, now);
  const targetLoop = Math.max(1, currentLoopFloor);

  const isConflict = validPunchesForRunner.some(
    (punch) => punch.runnerSlug === runnerSlug && punch.loopIndex === targetLoop,
  );
  if (isConflict) {
    return { ok: false, reason: 'already-punched-this-loop' };
  }

  return { ok: true, loopIndex: targetLoop };
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
  validPunchesForRunner: readonly LoopPunch[],
): number | null {
  const punchesInLoopOrder = validPunchesForRunner
    .filter((punch) => punch.runnerSlug === runnerSlug)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
  const deepestPunch = punchesInLoopOrder.at(-1);

  if (deepestPunch === undefined) return null;
  return loopDurationMs(edition, deepestPunch);
}
