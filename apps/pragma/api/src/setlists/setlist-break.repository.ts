import { and, asc, eq } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { setlistBreakTable } from './setlists.schema';

export type SetlistBreakRow = typeof setlistBreakTable.$inferSelect;

// @FollowsBlueprint repository-projection
const BREAK_PROJECTION = {
  id: setlistBreakTable.id,
  setlistId: setlistBreakTable.setlistId,
  position: setlistBreakTable.position,
  label: setlistBreakTable.label,
} as const;

export async function listBreaks(setlistId: string): Promise<SetlistBreakRow[]> {
  return await getDatabase()
    .select(BREAK_PROJECTION)
    .from(setlistBreakTable)
    .where(eq(setlistBreakTable.setlistId, setlistId))
    .orderBy(asc(setlistBreakTable.position));
}

export async function listBreakPositionsWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<Pick<SetlistBreakRow, 'id' | 'position'>[]> {
  return await executor
    .select({ id: setlistBreakTable.id, position: setlistBreakTable.position })
    .from(setlistBreakTable)
    .where(eq(setlistBreakTable.setlistId, setlistId));
}

export async function insertBreakWithin(
  executor: DatabaseExecutor,
  values: SetlistBreakRow,
): Promise<SetlistBreakRow> {
  const [row] = await executor.insert(setlistBreakTable).values(values).returning(BREAK_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateBreakLabel(
  setlistId: string,
  breakId: string,
  label: string,
): Promise<SetlistBreakRow | null> {
  const [row] = await getDatabase()
    .update(setlistBreakTable)
    .set({ label })
    .where(and(eq(setlistBreakTable.id, breakId), eq(setlistBreakTable.setlistId, setlistId)))
    .returning(BREAK_PROJECTION);
  return row ?? null;
}

export async function deleteBreakWithin(
  executor: DatabaseExecutor,
  setlistId: string,
  breakId: string,
): Promise<DeletionOutcome> {
  const deleted = await executor
    .delete(setlistBreakTable)
    .where(and(eq(setlistBreakTable.id, breakId), eq(setlistBreakTable.setlistId, setlistId)))
    .returning({ id: setlistBreakTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function setBreakPositionWithin(
  executor: DatabaseExecutor,
  breakId: string,
  position: number,
): Promise<void> {
  await executor
    .update(setlistBreakTable)
    .set({ position })
    .where(eq(setlistBreakTable.id, breakId));
}
