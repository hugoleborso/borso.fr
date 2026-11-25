import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { DEFAULT_GEAR_STATUS, GEAR_STATUSES, type GearStatus } from '@domain/gear-status.core';
import { gearItemTable } from './gear-items.schema';

const gearStatusSchema = z.enum(GEAR_STATUSES);

type GearItemTableRow = typeof gearItemTable.$inferSelect;

export type GearItemRow = Omit<GearItemTableRow, 'status'> & { status: GearStatus };

export type GearItemPersistedUpdate = Partial<Pick<GearItemRow, 'label' | 'status' | 'memberId'>>;

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: gearItemTable.id,
  sessionId: gearItemTable.sessionId,
  label: gearItemTable.label,
  status: gearItemTable.status,
  memberId: gearItemTable.memberId,
  position: gearItemTable.position,
} as const;

const LIST_ORDER = [asc(gearItemTable.position), asc(gearItemTable.label), asc(gearItemTable.id)];

function toGearItemRow(row: GearItemTableRow): GearItemRow {
  return { ...row, status: gearStatusSchema.parse(row.status) };
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneGearItemTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function listGearItemsOfSession(sessionId: string): Promise<GearItemRow[]> {
  return await listGearItemsOfSessionWithin(getDatabase(), sessionId);
}

export async function listGearItemsOfSessionWithin(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<GearItemRow[]> {
  const rows = await executor
    .select(PROJECTION)
    .from(gearItemTable)
    .where(eq(gearItemTable.sessionId, sessionId))
    .orderBy(...LIST_ORDER);
  return rows.map(toGearItemRow);
}

export async function listGearItemsOfSessions(
  sessionIds: readonly string[],
): Promise<GearItemRow[]> {
  if (sessionIds.length === 0) return [];
  const rows = await getDatabase()
    .select(PROJECTION)
    .from(gearItemTable)
    .where(inArray(gearItemTable.sessionId, [...sessionIds]))
    .orderBy(...LIST_ORDER);
  return rows.map(toGearItemRow);
}

export async function countGearItemsPerSession(): Promise<ReadonlyMap<string, number>> {
  const rows = await getDatabase()
    .select({ sessionId: gearItemTable.sessionId, itemCount: count() })
    .from(gearItemTable)
    .groupBy(gearItemTable.sessionId);
  return new Map(rows.map((row) => [row.sessionId, row.itemCount]));
}

export async function nextGearPositionWithin(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<number> {
  const [row] = await executor
    .select({ lastPosition: max(gearItemTable.position) })
    .from(gearItemTable)
    .where(eq(gearItemTable.sessionId, sessionId));
  const lastPosition = row?.lastPosition ?? null;
  return lastPosition === null ? 0 : lastPosition + 1;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function insertGearItemOnceWithin(
  executor: DatabaseExecutor,
  item: GearItemRow,
): Promise<void> {
  await executor.insert(gearItemTable).values(item).onConflictDoNothing();
}

export async function insertGearItemsWithin(
  executor: DatabaseExecutor,
  items: readonly GearItemRow[],
): Promise<GearItemRow[]> {
  if (items.length === 0) return [];
  const rows = await executor
    .insert(gearItemTable)
    .values([...items])
    .returning(PROJECTION);
  return rows.map(toGearItemRow);
}

export async function findGearItem(id: string): Promise<GearItemRow | null> {
  return await findGearItemWithin(getDatabase(), id);
}

export async function findGearItemWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<GearItemRow | null> {
  const [row] = await executor
    .select(PROJECTION)
    .from(gearItemTable)
    .where(eq(gearItemTable.id, id))
    .limit(1);
  return row === undefined ? null : toGearItemRow(row);
}

export async function updateGearItemWithin(
  executor: DatabaseExecutor,
  sessionId: string,
  id: string,
  updates: GearItemPersistedUpdate,
): Promise<GearItemRow | null> {
  const [row] = await executor
    .update(gearItemTable)
    .set(updates)
    .where(and(eq(gearItemTable.id, id), eq(gearItemTable.sessionId, sessionId)))
    .returning(PROJECTION);
  return row === undefined ? null : toGearItemRow(row);
}

export async function deleteGearItem(sessionId: string, id: string): Promise<DeletionOutcome> {
  const deleted = await getDatabase()
    .delete(gearItemTable)
    .where(and(eq(gearItemTable.id, id), eq(gearItemTable.sessionId, sessionId)))
    .returning({ id: gearItemTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function releaseGearOfDeletedMember(
  transaction: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await transaction
    .update(gearItemTable)
    .set({ status: DEFAULT_GEAR_STATUS, memberId: null })
    .where(eq(gearItemTable.memberId, memberId));
}

export async function deleteGearOfDeletedSession(
  transaction: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await transaction.delete(gearItemTable).where(eq(gearItemTable.sessionId, sessionId));
}
