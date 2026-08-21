import { randomUUID } from 'node:crypto';
import type { DatabaseExecutor } from '../database/client';
import { loopIndexAt } from '../edition/edition.core';
import { getEdition } from '../edition/edition.service';
import type { RaceEdition } from '../edition/edition.types';
import { haversineDistanceMeters } from '../helpers/geo/haversine.utils';

import { z } from 'zod';
import { hourlyTopOfLoopMs, type PunchRejectReason, validatePunchTiming } from './punch.core';
import {
  catchupPunchInputSchema,
  createDidNotFinishInputSchema,
  createPunchInputSchema,
  selfPunchInputSchema,
} from './punch.schema';
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
  runInOneTransaction,
} from './punch.repository';
import type { LoopPunch, ManualDidNotFinish } from './punch.types';

// @FollowsBlueprint named-domain-error
export class PunchNotFoundError extends Error {
  override readonly name = 'PunchNotFoundError';
}

// @FollowsBlueprint named-domain-error
export class PunchConflictError extends Error {
  override readonly name = 'PunchConflictError';
  constructor(public readonly existing: LoopPunch) {
    super(`punch conflict for edition/runner/loop_index`);
  }
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

export type RegisterPunchInput = z.infer<typeof createPunchInputSchema>;

async function buildPunchRejectionError(
  edition: RaceEdition,
  input: RegisterPunchInput,
  reason: PunchRejectReason,
  now: Date,
): Promise<PunchConflictError | PunchRejectedError> {
  if (reason !== 'already-punched-this-loop') return new PunchRejectedError(reason);
  const conflictLoop = Math.max(1, loopIndexAt(edition, now));
  const existing = await findActivePunchForLoop(input.editionSlug, input.runnerSlug, conflictLoop);
  if (existing !== null) return new PunchConflictError(existing);
  return new PunchRejectedError(reason);
}

/**
 * @Blueprint service-orchestration
 * @BlueprintName Service Orchestration
 * @BlueprintUsage Use for a workflow that reads, decides, then writes. The service is the only impure layer allowed to be interesting.
 * @BlueprintDescription Reads the edition and the runner's existing punches through the repository, hands them to a pure decision function in punch.core.ts, throws a named domain error when the decision rejects, and writes through the repository. The branches live in the core file, so the service reads as a sequence of steps.
 */
export async function registerPunch(input: RegisterPunchInput, now: Date): Promise<LoopPunch> {
  const edition: RaceEdition = await getEdition(input.editionSlug);
  const existingPunches = await listPunchesForEdition(input.editionSlug);
  const runnerPunches = existingPunches.filter((punch) => punch.runnerSlug === input.runnerSlug);

  const validation = validatePunchTiming(edition, input.runnerSlug, runnerPunches, now);
  if (!validation.ok) {
    throw await buildPunchRejectionError(edition, input, validation.reason, now);
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

  await runInOneTransaction((executor) => insertPunch(executor, punch));
  return punch;
}

export type SelfPunchInput = z.infer<typeof selfPunchInputSchema>;

export async function registerSelfPunch(
  input: SelfPunchInput,
  userAgent: string | null,
  now: Date,
): Promise<LoopPunch> {
  const edition: RaceEdition = await getEdition(input.editionSlug);
  const distanceFromCenter =
    input.clientLat === null || input.clientLng === null
      ? null
      : haversineDistanceMeters(
          { lat: input.clientLat, lng: input.clientLng },
          edition.gpx.startLatLng,
        );

  const existingPunches = await listPunchesForEdition(input.editionSlug);
  const runnerPunches = existingPunches.filter((punch) => punch.runnerSlug === input.runnerSlug);

  const validation = validatePunchTiming(edition, input.runnerSlug, runnerPunches, now);
  if (!validation.ok) {
    throw await buildPunchRejectionError(edition, input, validation.reason, now);
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
  await runInOneTransaction((executor) => insertPunch(executor, punch));
  return punch;
}

export async function correctPunch(
  id: string,
  finishedAtIso: string,
  now: Date,
): Promise<LoopPunch> {
  const existing = await findPunchById(id);
  if (existing === null) throw new PunchNotFoundError(id);
  const newFinishedAt = new Date(finishedAtIso);
  await markPunchCorrected(id, newFinishedAt, now);
  return { ...existing, finishedAt: newFinishedAt, correctedAt: now };
}

export async function voidPunch(id: string, now: Date): Promise<LoopPunch> {
  const existing = await findPunchById(id);
  if (existing === null) throw new PunchNotFoundError(id);
  await markPunchVoided(id, now);
  return { ...existing, voidedAt: now };
}

export type RecordDidNotFinishInput = z.infer<typeof createDidNotFinishInputSchema>;

export async function recordManualDidNotFinish(
  input: RecordDidNotFinishInput,
  now: Date,
): Promise<ManualDidNotFinish> {
  const manualDidNotFinish: ManualDidNotFinish = { ...input, decidedAt: now };
  await insertManualDidNotFinish(manualDidNotFinish);
  return manualDidNotFinish;
}

export async function listEditionPunches(editionSlug: string): Promise<readonly LoopPunch[]> {
  return listPunchesForEdition(editionSlug);
}

export async function listManualDidNotFinishes(
  editionSlug: string,
): Promise<readonly ManualDidNotFinish[]> {
  return listManualDidNotFinishesForEdition(editionSlug);
}

export type CatchupPunchInput = z.infer<typeof catchupPunchInputSchema>;

function lastInstantOfLoop(edition: RaceEdition, loopIndex: number): number {
  const ONE_MILLISECOND = 1;
  return hourlyTopOfLoopMs(edition, loopIndex + 1) - ONE_MILLISECOND;
}

export async function catchupPunch(input: CatchupPunchInput, now: Date): Promise<LoopPunch> {
  const edition = await getEdition(input.editionSlug);
  const currentLoopFloor = loopIndexAt(edition, now);
  if (input.loopIndex > currentLoopFloor) {
    throw new PunchRejectedError('race-not-started');
  }
  const existing = await findActivePunchForLoop(
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
    finishedAt: new Date(lastInstantOfLoop(edition, input.loopIndex)),
    correctedAt: now,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };
  await runInOneTransaction(async (executor) => {
    await insertPunch(executor, punch);
    await deleteManualDidNotFinish(executor, input.editionSlug, input.runnerSlug);
  });
  return punch;
}

export async function clearEditionPunchHistory(editionSlug: string): Promise<void> {
  await runInOneTransaction((executor) =>
    deleteAllEditionPunchesAndDidNotFinishes(executor, editionSlug),
  );
}

export async function clearEditionPunchHistoryWithin(
  executor: DatabaseExecutor,
  editionSlug: string,
): Promise<void> {
  await deleteAllEditionPunchesAndDidNotFinishes(executor, editionSlug);
}

export async function seedPunch(punch: LoopPunch): Promise<void> {
  await runInOneTransaction((executor) => insertPunch(executor, punch));
}

export async function seedManualDidNotFinish(didNotFinish: ManualDidNotFinish): Promise<void> {
  await insertManualDidNotFinish(didNotFinish);
}
