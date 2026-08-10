import { randomUUID } from 'node:crypto';
import type { Database } from '../database/client';
import { loopIndexAt } from '../edition/edition.core';
import { getEdition } from '../edition/edition.service';
import type { RaceEdition } from '../edition/edition.types';
import { haversineDistanceMeters } from '../helpers/geo/haversine.utils';

// @FollowsBlueprint service-facade-reexport
export { PunchConflictError } from './punch.repository';

import { type PunchRejectReason, validatePunchTiming } from './punch.core';
import {
  deleteAllEditionPunchesAndDidNotFinishes,
  deleteManualDidNotFinish,
  findActivePunchForLoop,
  findPunchById,
  insertManualDidNotFinish,
  insertPunch,
  listManualDidNotFinishesForEdition,
  listPunchesForEdition,
  markPunchCorrected,
  markPunchVoided,
  PunchConflictError,
} from './punch.repository';
import type { LoopPunch, ManualDidNotFinish } from './punch.types';

export { getDatabase } from '../database/client';

// @FollowsBlueprint named-domain-error
export class PunchNotFoundError extends Error {
  override readonly name = 'PunchNotFoundError';
}

/**
 * @Blueprint named-domain-error
 * @BlueprintName Named Domain Error
 * @BlueprintUsage Use for a failure a caller has to tell apart, so the controller matches on the class rather than on the message text.
 * @BlueprintDescription Subclasses `Error` and overrides `name` with a string literal, because a subclass otherwise inherits `Error.prototype.name` and calls itself `Error`, and carries the machine readable reason as a readonly field so the controller answers with it instead of parsing the message.
 */
export class PunchRejectedError extends Error {
  override readonly name = 'PunchRejectedError';
  constructor(public readonly reason: PunchRejectReason) {
    super(`punch rejected: ${reason}`);
  }
}

export interface RegisterPunchInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
}

/**
 * The error a rejected punch attempt should throw. `already-punched-this-loop`
 * is the one reason the caller can be told *which* punch is in the way, so it
 * costs a repository read the other reasons do not need.
 */
async function buildPunchRejectionError(
  database: Database,
  edition: RaceEdition,
  input: RegisterPunchInput,
  reason: PunchRejectReason,
  now: Date,
): Promise<PunchConflictError | PunchRejectedError> {
  if (reason !== 'already-punched-this-loop') return new PunchRejectedError(reason);
  const conflictLoop = Math.max(1, loopIndexAt(edition, now));
  const existing = await findActivePunchForLoop(
    database,
    input.editionSlug,
    input.runnerSlug,
    conflictLoop,
  );
  if (existing !== null) return new PunchConflictError(existing);
  return new PunchRejectedError(reason);
}

/**
 * @Blueprint service-orchestration
 * @BlueprintName Service Orchestration
 * @BlueprintUsage Use for a workflow that reads, decides, then writes. The service is the only impure layer allowed to be interesting.
 * @BlueprintDescription Reads the edition and the runner's existing punches through the repository, hands them to a pure decision function in punch.core.ts, throws a named domain error when the decision rejects, and writes through the repository. The branches live in the core file, so the service reads as a sequence of steps.
 */
export async function registerPunch(
  database: Database,
  input: RegisterPunchInput,
  now: Date,
): Promise<LoopPunch> {
  const edition: RaceEdition = await getEdition(database, input.editionSlug);
  const existingPunches = await listPunchesForEdition(database, input.editionSlug);
  const runnerPunches = existingPunches.filter((punch) => punch.runnerSlug === input.runnerSlug);

  const validation = validatePunchTiming(edition, input.runnerSlug, runnerPunches, now);
  if (!validation.ok) {
    throw await buildPunchRejectionError(database, edition, input, validation.reason, now);
  }

  const punch: LoopPunch = {
    id: randomUUID(),
    editionSlug: input.editionSlug,
    runnerSlug: input.runnerSlug,
    loopIndex: validation.loopIndex,
    finishedAt: now,
    correctedAt: null,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };

  // No DB-level uniqueness on (edition_slug, runner_slug, loop_index)
  // any more — Aurora DSQL rejects the partial unique index we used to
  // rely on, and a non-partial unique would block the void-then-re-punch
  // flow. The race window between `validatePunchTiming` and `insertPunch`
  // stays narrow in practice (single tap-in per runner from one phone);
  // if it ever matters, the next layer is a `SELECT ... FOR UPDATE`.
  await insertPunch(database, punch);
  return punch;
}

export interface SelfPunchInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
}

export async function registerSelfPunch(
  database: Database,
  input: SelfPunchInput,
  userAgent: string | null,
  now: Date,
): Promise<LoopPunch> {
  const edition: RaceEdition = await getEdition(database, input.editionSlug);
  const distanceFromCenter =
    input.clientLat === null || input.clientLng === null
      ? null
      : haversineDistanceMeters(
          { lat: input.clientLat, lng: input.clientLng },
          edition.gpx.startLatLng,
        );

  const existingPunches = await listPunchesForEdition(database, input.editionSlug);
  const runnerPunches = existingPunches.filter((punch) => punch.runnerSlug === input.runnerSlug);

  const validation = validatePunchTiming(edition, input.runnerSlug, runnerPunches, now);
  if (!validation.ok) {
    throw await buildPunchRejectionError(database, edition, input, validation.reason, now);
  }

  const punch: LoopPunch = {
    id: randomUUID(),
    editionSlug: input.editionSlug,
    runnerSlug: input.runnerSlug,
    loopIndex: validation.loopIndex,
    finishedAt: now,
    correctedAt: null,
    voidedAt: null,
    source: 'self',
    clientLat: input.clientLat,
    clientLng: input.clientLng,
    clientAccuracyM: input.clientAccuracyM,
    distanceFromCenterM: distanceFromCenter,
    userAgent,
  };
  await insertPunch(database, punch);
  return punch;
}

/**
 * Move an existing punch to a new finishing instant. `finishedAtIso` arrives
 * as the ISO string the request carried; the service owns the conversion so
 * the controller stays free of domain types.
 */
export async function correctPunch(
  database: Database,
  id: string,
  finishedAtIso: string,
  now: Date,
): Promise<LoopPunch> {
  const existing = await findPunchById(database, id);
  if (existing === null) throw new PunchNotFoundError(id);
  const newFinishedAt = new Date(finishedAtIso);
  await markPunchCorrected(database, id, newFinishedAt, now);
  return { ...existing, finishedAt: newFinishedAt, correctedAt: now };
}

export async function voidPunch(database: Database, id: string, now: Date): Promise<LoopPunch> {
  const existing = await findPunchById(database, id);
  if (existing === null) throw new PunchNotFoundError(id);
  await markPunchVoided(database, id, now);
  return { ...existing, voidedAt: now };
}

export interface RecordDidNotFinishInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
}

export async function recordManualDidNotFinish(
  database: Database,
  input: RecordDidNotFinishInput,
  now: Date,
): Promise<ManualDidNotFinish> {
  const manualDidNotFinish: ManualDidNotFinish = { ...input, decidedAt: now };
  await insertManualDidNotFinish(database, manualDidNotFinish);
  return manualDidNotFinish;
}

export async function getPunchesForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly LoopPunch[]> {
  return listPunchesForEdition(database, editionSlug);
}

export async function listManualDidNotFinishes(
  database: Database,
  editionSlug: string,
): Promise<readonly ManualDidNotFinish[]> {
  return listManualDidNotFinishesForEdition(database, editionSlug);
}

export interface CatchupPunchInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  /**
   * 1-based loop index to validate retroactively. Typically `outAtLoop + 1`
   * for a runner the system marked `dnf:late outAtLoop=K` — the orga gives
   * them credit for loop K+1 with a conservative 1-h time.
   */
  readonly loopIndex: number;
}

/**
 * Retroactively credit a missed loop to a DNFed runner, then drop any
 * manual_dnf row so they walk back into `in-race`. The punch's
 * `finishedAt` is parked at the END of the requested loop's hour
 * (top + intervalMs − 1 ms), which gives the runner a one-hour loop
 * time — the worst case allowed in a backyard, and the natural
 * "default" when the orga forgot to scan them mid-loop.
 *
 * Rejected when:
 *   - the runner already has an active punch for this loop (would
 *     duplicate the in-race row);
 *   - the requested loop hasn't started yet (`loopIndex` > current).
 */
export async function catchupPunch(
  database: Database,
  input: CatchupPunchInput,
  now: Date,
): Promise<LoopPunch> {
  const edition = await getEdition(database, input.editionSlug);
  const intervalMs = edition.intervalMinutes * 60_000;
  const startMs = edition.startsAt.getTime();
  const currentLoopFloor = loopIndexAt(edition, now);
  if (input.loopIndex > currentLoopFloor) {
    throw new PunchRejectedError('race-not-started');
  }
  const existing = await findActivePunchForLoop(
    database,
    input.editionSlug,
    input.runnerSlug,
    input.loopIndex,
  );
  if (existing !== null) throw new PunchConflictError(existing);

  const punch: LoopPunch = {
    id: randomUUID(),
    editionSlug: input.editionSlug,
    runnerSlug: input.runnerSlug,
    loopIndex: input.loopIndex,
    finishedAt: new Date(startMs + input.loopIndex * intervalMs - 1),
    correctedAt: now,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };
  await insertPunch(database, punch);
  await deleteManualDidNotFinish(database, input.editionSlug, input.runnerSlug);
  return punch;
}

/**
 * Drop every punch and every manual did-not-finish row of one edition.
 * Exposed for the test seeding endpoint, which starts each fixture from an
 * empty punch history so a previous fixture cannot leak into the standings.
 */
export async function clearEditionPunchHistory(
  database: Database,
  editionSlug: string,
): Promise<void> {
  await deleteAllEditionPunchesAndDidNotFinishes(database, editionSlug);
}

export async function seedPunch(database: Database, punch: LoopPunch): Promise<void> {
  await insertPunch(database, punch);
}

export async function seedManualDidNotFinish(
  database: Database,
  didNotFinish: ManualDidNotFinish,
): Promise<void> {
  await insertManualDidNotFinish(database, didNotFinish);
}
