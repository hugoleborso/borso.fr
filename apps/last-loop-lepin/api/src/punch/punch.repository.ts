import { and, eq, isNull } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { loopPunchesTable, manualDidNotFinishesTable } from './punch.schema';
import type { LoopPunch, ManualDidNotFinish, PunchSource } from './punch.types';

/**
 * @Blueprint repository-query
 * @BlueprintName Repository Query
 * @BlueprintUsage Use for data access. Drizzle queries and transactions only, and the single file allowed to import the database client for its slice.
 * @BlueprintDescription Holds every query against the punch tables. Each function returns rows, an array of rows, or a count, with no business condition, no derived field, and no formatting. A shape the database does not have is built by a core function the service calls.
 */
type LoopPunchRow = typeof loopPunchesTable.$inferSelect;

function narrowPunchSource(raw: string | null): PunchSource {
  return raw === 'self' ? 'self' : 'admin';
}

/**
 * @Blueprint repository-row-mapper
 * @BlueprintName Repository Row Mapper
 * @BlueprintUsage Use for a column wider than the domain type, so the narrowing happens once at the data boundary instead of at every read site.
 * @BlueprintDescription Derives the row shape from the table with `$inferSelect` rather than restating its columns, so a column added to the schema cannot leave a hand-written twin behind, and maps it field by field, routing the nullable `source` column through `narrowPunchSource` so a value the database allows but the domain does not becomes the default rather than leaking out as `string | null`. A repository whose reads are projections rather than whole rows types the projection instead, which is what `repository-projection` is for.
 */
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

// @FollowsBlueprint named-domain-error
export class PunchConflictError extends Error {
  override readonly name = 'PunchConflictError';
  constructor(public readonly existing: LoopPunch) {
    super(`punch conflict for edition/runner/loop_index`);
  }
}

export async function runInOneTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function insertPunch(executor: DatabaseExecutor, punch: LoopPunch): Promise<void> {
  await executor.insert(loopPunchesTable).values({
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
  editionSlug: string,
  runnerSlug: string,
  loopIndex: number,
): Promise<LoopPunch | null> {
  const rows = await getDatabase()
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

export async function listPunchesForEdition(editionSlug: string): Promise<readonly LoopPunch[]> {
  const rows = await getDatabase()
    .select()
    .from(loopPunchesTable)
    .where(eq(loopPunchesTable.editionSlug, editionSlug));
  return rows.map(rowToLoopPunch);
}

export async function findPunchById(id: string): Promise<LoopPunch | null> {
  const rows = await getDatabase()
    .select()
    .from(loopPunchesTable)
    .where(eq(loopPunchesTable.id, id))
    .limit(1);
  const first = rows[0];
  return first === undefined ? null : rowToLoopPunch(first);
}

export async function markPunchCorrected(
  id: string,
  finishedAt: Date,
  correctedAt: Date,
): Promise<void> {
  await getDatabase()
    .update(loopPunchesTable)
    .set({ finishedAt, correctedAt })
    .where(eq(loopPunchesTable.id, id));
}

export async function markPunchVoided(id: string, voidedAt: Date): Promise<void> {
  await getDatabase().update(loopPunchesTable).set({ voidedAt }).where(eq(loopPunchesTable.id, id));
}

export async function insertManualDidNotFinish(didNotFinish: ManualDidNotFinish): Promise<void> {
  await getDatabase().insert(manualDidNotFinishesTable).values(didNotFinish);
}

export async function deleteManualDidNotFinish(
  executor: DatabaseExecutor,
  editionSlug: string,
  runnerSlug: string,
): Promise<void> {
  await executor
    .delete(manualDidNotFinishesTable)
    .where(
      and(
        eq(manualDidNotFinishesTable.editionSlug, editionSlug),
        eq(manualDidNotFinishesTable.runnerSlug, runnerSlug),
      ),
    );
}

export async function deleteAllEditionPunchesAndDidNotFinishes(
  executor: DatabaseExecutor,
  editionSlug: string,
): Promise<void> {
  await executor.delete(loopPunchesTable).where(eq(loopPunchesTable.editionSlug, editionSlug));
  await executor
    .delete(manualDidNotFinishesTable)
    .where(eq(manualDidNotFinishesTable.editionSlug, editionSlug));
}

export async function listManualDidNotFinishesForEdition(
  editionSlug: string,
): Promise<readonly ManualDidNotFinish[]> {
  const rows = await getDatabase()
    .select()
    .from(manualDidNotFinishesTable)
    .where(eq(manualDidNotFinishesTable.editionSlug, editionSlug));
  return rows.map((row) => ({
    editionSlug: row.editionSlug,
    runnerSlug: row.runnerSlug,
    outAtLoop: row.outAtLoop,
    reason: row.reason === 'manual' ? 'manual' : 'late',
    decidedAt: row.decidedAt,
  }));
}
