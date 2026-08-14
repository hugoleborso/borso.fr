import { and, eq, isNull } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { loopPunchesTable, manualDidNotFinishesTable } from './punch.schema';
import type { LoopPunch, ManualDidNotFinish, PunchSource } from './punch.types';

/**
 * @Blueprint repository-query
 * @BlueprintName Repository Query
 * @BlueprintUsage Use for data access. Drizzle queries and transactions only, and the single file allowed to import the database client for its slice.
 * @BlueprintDescription Holds every query against the punch tables. Each function returns rows, an array of rows, or a count, with no business condition, no derived field, and no formatting. A shape the database does not have is built by a core function the service calls.
 */
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

/**
 * @Blueprint repository-row-mapper
 * @BlueprintName Repository Row Mapper
 * @BlueprintUsage Use for a column wider than the domain type, so the narrowing happens once at the data boundary instead of at every read site.
 * @BlueprintDescription Declares the row shape as a private interface and maps it field by field, routing the nullable `source` column through `narrowPunchSource` so a value the database allows but the domain does not becomes the default rather than leaking out as `string | null`.
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

export async function insertPunch(punch: LoopPunch): Promise<void> {
  await getDatabase().insert(loopPunchesTable).values({
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

/**
 * Drop the manual_dnf row for a runner. Used when the orga retroactively
 * validates a missed loop (catch-up flow) — the runner walks back into
 * `in-race` once their DNF marker is gone and the catch-up punch lands.
 */
export async function deleteManualDidNotFinish(
  editionSlug: string,
  runnerSlug: string,
): Promise<void> {
  await getDatabase()
    .delete(manualDidNotFinishesTable)
    .where(
      and(
        eq(manualDidNotFinishesTable.editionSlug, editionSlug),
        eq(manualDidNotFinishesTable.runnerSlug, runnerSlug),
      ),
    );
}

/**
 * Drop every punch and every manual did-not-finish row of one edition.
 * Used by the test seeding endpoint, which rebuilds a fixture from a clean
 * slate so a previous fixture's rows cannot leak into the next standings.
 */
export async function deleteAllEditionPunchesAndDidNotFinishes(editionSlug: string): Promise<void> {
  await getDatabase().delete(loopPunchesTable).where(eq(loopPunchesTable.editionSlug, editionSlug));
  await getDatabase()
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
