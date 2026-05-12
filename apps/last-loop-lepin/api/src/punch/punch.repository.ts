import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../database/client';
import { loopPunchesTable, manualDnfsTable } from './punch.schema';
import type { LoopPunch, ManualDnf } from './punch.types';

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
  return rows[0] ?? null;
}

export async function listPunchesForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly LoopPunch[]> {
  return database.select().from(loopPunchesTable).where(eq(loopPunchesTable.editionSlug, editionSlug));
}

export async function findPunchById(database: Database, id: string): Promise<LoopPunch | null> {
  const rows = await database
    .select()
    .from(loopPunchesTable)
    .where(eq(loopPunchesTable.id, id))
    .limit(1);
  return rows[0] ?? null;
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
