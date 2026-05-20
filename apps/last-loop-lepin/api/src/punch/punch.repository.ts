import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../database/client';
import { loopPunchesTable, manualDnfsTable } from './punch.schema';
import type { LoopPunch, ManualDnf, PunchSource } from './punch.types';

interface LoopPunchRow {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
  readonly correctedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly source: string | null;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
  readonly distanceFromCenterM: number | null;
  readonly userAgent: string | null;
}

function narrowPunchSource(raw: string | null): PunchSource {
  return raw === 'self' ? 'self' : 'admin';
}

function rowToLoopPunch(row: LoopPunchRow): LoopPunch {
  return {
    id: row.id,
    editionSlug: row.editionSlug,
    runnerSlug: row.runnerSlug,
    loopIndex: row.loopIndex,
    finishedAt: row.finishedAt,
    correctedAt: row.correctedAt,
    voidedAt: row.voidedAt,
    source: narrowPunchSource(row.source),
    clientLat: row.clientLat,
    clientLng: row.clientLng,
    clientAccuracyM: row.clientAccuracyM,
    distanceFromCenterM: row.distanceFromCenterM,
    userAgent: row.userAgent,
  };
}

export class PunchConflictError extends Error {
  override readonly name = 'PunchConflictError';
  constructor(public readonly existing: LoopPunch) {
    super(`punch conflict for edition/runner/loop_index`);
  }
}

export async function insertPunch(database: Database, punch: LoopPunch): Promise<void> {
  await database.insert(loopPunchesTable).values({
    id: punch.id,
    editionSlug: punch.editionSlug,
    runnerSlug: punch.runnerSlug,
    loopIndex: punch.loopIndex,
    finishedAt: punch.finishedAt,
    correctedAt: punch.correctedAt,
    voidedAt: punch.voidedAt,
    source: punch.source,
    clientLat: punch.clientLat,
    clientLng: punch.clientLng,
    clientAccuracyM: punch.clientAccuracyM,
    distanceFromCenterM: punch.distanceFromCenterM,
    userAgent: punch.userAgent,
  });
}

export async function findActivePunchForLoop(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
  loopIndex: number,
): Promise<LoopPunch | null> {
  const rows = await database
    .select()
    .from(loopPunchesTable)
    .where(
      and(
        eq(loopPunchesTable.editionSlug, editionSlug),
        eq(loopPunchesTable.runnerSlug, runnerSlug),
        eq(loopPunchesTable.loopIndex, loopIndex),
        isNull(loopPunchesTable.voidedAt),
      ),
    )
    .limit(1);
  const first = rows[0];
  return first === undefined ? null : rowToLoopPunch(first);
}

export async function listPunchesForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly LoopPunch[]> {
  const rows = await database
    .select()
    .from(loopPunchesTable)
    .where(eq(loopPunchesTable.editionSlug, editionSlug));
  return rows.map(rowToLoopPunch);
}

export async function findPunchById(database: Database, id: string): Promise<LoopPunch | null> {
  const rows = await database
    .select()
    .from(loopPunchesTable)
    .where(eq(loopPunchesTable.id, id))
    .limit(1);
  const first = rows[0];
  return first === undefined ? null : rowToLoopPunch(first);
}

export async function markPunchCorrected(
  database: Database,
  id: string,
  finishedAt: Date,
  correctedAt: Date,
): Promise<void> {
  await database
    .update(loopPunchesTable)
    .set({ finishedAt, correctedAt })
    .where(eq(loopPunchesTable.id, id));
}

export async function markPunchVoided(
  database: Database,
  id: string,
  voidedAt: Date,
): Promise<void> {
  await database
    .update(loopPunchesTable)
    .set({ voidedAt })
    .where(eq(loopPunchesTable.id, id));
}

export async function insertManualDnf(database: Database, dnf: ManualDnf): Promise<void> {
  await database.insert(manualDnfsTable).values(dnf);
}

/**
 * Drop the manual_dnf row for a runner. Used when the orga retroactively
 * validates a missed loop (catch-up flow) — the runner walks back into
 * `in-race` once their DNF marker is gone and the catch-up punch lands.
 */
export async function deleteManualDnf(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
): Promise<void> {
  await database
    .delete(manualDnfsTable)
    .where(
      and(
        eq(manualDnfsTable.editionSlug, editionSlug),
        eq(manualDnfsTable.runnerSlug, runnerSlug),
      ),
    );
}

export async function listManualDnfsForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly ManualDnf[]> {
  const rows = await database
    .select()
    .from(manualDnfsTable)
    .where(eq(manualDnfsTable.editionSlug, editionSlug));
  return rows.map((row) => ({
    editionSlug: row.editionSlug,
    runnerSlug: row.runnerSlug,
    outAtLoop: row.outAtLoop,
    reason: row.reason === 'manual' ? 'manual' : 'late',
    decidedAt: row.decidedAt,
  }));
}
