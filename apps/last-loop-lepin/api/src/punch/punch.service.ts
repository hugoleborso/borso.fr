import { randomUUID } from 'node:crypto';
import type { Database } from '../database/client';
import { getEdition } from '../edition/edition.service';
import type { RaceEdition } from '../edition/edition.types';
import { validatePunchTiming, type PunchRejectReason } from './punch.core';
import {
  PunchConflictError,
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
      const existing = await findActivePunchForLoop(
        database,
        input.editionSlug,
        input.runnerSlug,
        runnerPunches.length + 1,
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
  };

  try {
    await insertPunch(database, punch);
  } catch (error) {
    if (error instanceof Error && error.message.includes('loop_punches_active_uq')) {
      const existing = await findActivePunchForLoop(
        database,
        punch.editionSlug,
        punch.runnerSlug,
        punch.loopIndex,
      );
      if (existing !== null) throw new PunchConflictError(existing);
    }
    throw error;
  }

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
