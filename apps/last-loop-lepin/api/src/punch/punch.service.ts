import { randomUUID } from 'node:crypto';
import type { Database } from '../database/client';
import { loopIndexAt } from '../edition/edition.core';
import { getEdition } from '../edition/edition.service';
import type { RaceEdition } from '../edition/edition.types';
import { haversineDistanceMeters } from '../helpers/geo/haversine.utils';
import { validatePunchTiming, type PunchRejectReason } from './punch.core';
import {
  PunchConflictError,
  deleteManualDnf,
  findActivePunchForLoop,
  findPunchById,
  insertManualDnf,
  insertPunch,
  listPunchesForEdition,
  markPunchCorrected,
  markPunchVoided,
} from './punch.repository';
import type { LoopPunch, ManualDnf } from './punch.types';

export class PunchNotFoundError extends Error {
  override readonly name = 'PunchNotFoundError';
}

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
    if (validation.reason === 'already-punched-this-loop') {
      const conflictLoop = Math.max(1, loopIndexAt(edition, now));
      const existing = await findActivePunchForLoop(
        database,
        input.editionSlug,
        input.runnerSlug,
        conflictLoop,
      );
      if (existing !== null) throw new PunchConflictError(existing);
    }
    throw new PunchRejectedError(validation.reason);
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

/**
 * Runner-driven punch. Loads the edition; when both `clientLat` and
 * `clientLng` are provided, records the great-circle distance from the
 * GPX start point as observability metadata (no longer used as a
 * rejection signal — the geofence check was removed per operator
 * decision on 2026-05-15). Delegates to `validatePunchTiming` for the
 * timing rules, then writes the row with `source='self'` and the
 * available metadata. No IP captured — `userAgent` + coordinates are
 * the contestability surface, IP adds nothing on top (cf. spec Q.O.D.
 * Q8).
 */
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
    if (validation.reason === 'already-punched-this-loop') {
      const conflictLoop = Math.max(1, loopIndexAt(edition, now));
      const existing = await findActivePunchForLoop(
        database,
        input.editionSlug,
        input.runnerSlug,
        conflictLoop,
      );
      if (existing !== null) throw new PunchConflictError(existing);
    }
    throw new PunchRejectedError(validation.reason);
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

export async function correctPunch(
  database: Database,
  id: string,
  newFinishedAt: Date,
  now: Date,
): Promise<LoopPunch> {
  const existing = await findPunchById(database, id);
  if (existing === null) throw new PunchNotFoundError(id);
  await markPunchCorrected(database, id, newFinishedAt, now);
  return { ...existing, finishedAt: newFinishedAt, correctedAt: now };
}

export async function voidPunch(database: Database, id: string, now: Date): Promise<LoopPunch> {
  const existing = await findPunchById(database, id);
  if (existing === null) throw new PunchNotFoundError(id);
  await markPunchVoided(database, id, now);
  return { ...existing, voidedAt: now };
}

export interface RecordDnfInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
}

export async function recordManualDnf(
  database: Database,
  input: RecordDnfInput,
  now: Date,
): Promise<ManualDnf> {
  const dnf: ManualDnf = { ...input, decidedAt: now };
  await insertManualDnf(database, dnf);
  return dnf;
}

export async function getPunchesForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly LoopPunch[]> {
  return listPunchesForEdition(database, editionSlug);
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
  await deleteManualDnf(database, input.editionSlug, input.runnerSlug);
  return punch;
}
