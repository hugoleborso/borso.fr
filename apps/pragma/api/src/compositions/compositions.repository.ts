import { desc, eq, sql } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { compositionTable } from './compositions.schema';
import type { CompositionRow } from './compositions.types';

// @FollowsBlueprint repository-projection
const COMPOSITION_PROJECTION = {
  id: compositionTable.id,
  title: compositionTable.title,
  songId: compositionTable.songId,
  createdAt: compositionTable.createdAt,
} as const;

// @FollowsBlueprint repository-owned-transaction
export async function runInOneCompositionTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function listCompositionsNewestFirst(): Promise<CompositionRow[]> {
  return await getDatabase()
    .select(COMPOSITION_PROJECTION)
    .from(compositionTable)
    .orderBy(desc(compositionTable.createdAt), desc(compositionTable.id));
}

// @FollowsBlueprint repository-idempotent-upsert
export async function hasInsertedCompositionWithin(
  executor: DatabaseExecutor,
  composition: CompositionRow,
): Promise<boolean> {
  const inserted = await executor
    .insert(compositionTable)
    .values(composition)
    .onConflictDoNothing()
    .returning({ id: compositionTable.id });
  return inserted.length > 0;
}

export async function findCompositionWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<CompositionRow | null> {
  const [composition] = await executor
    .select(COMPOSITION_PROJECTION)
    .from(compositionTable)
    .where(eq(compositionTable.id, id))
    .limit(1);
  return composition ?? null;
}

export async function findRenamedComposition(
  id: string,
  title: string,
): Promise<CompositionRow | null> {
  const [composition] = await getDatabase()
    .update(compositionTable)
    .set({ title })
    .where(eq(compositionTable.id, id))
    .returning(COMPOSITION_PROJECTION);
  return composition ?? null;
}

// @FollowsBlueprint repository-conditional-claim
export async function findClaimedCompositionWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<CompositionRow | null> {
  const [composition] = await executor
    .update(compositionTable)
    .set({ title: sql`${compositionTable.title}` })
    .where(eq(compositionTable.id, id))
    .returning(COMPOSITION_PROJECTION);
  return composition ?? null;
}

export async function linkCompositionToSongWithin(
  executor: DatabaseExecutor,
  id: string,
  songId: string,
): Promise<void> {
  await executor.update(compositionTable).set({ songId }).where(eq(compositionTable.id, id));
}

export async function didDeleteCompositionWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<boolean> {
  const deleted = await executor
    .delete(compositionTable)
    .where(eq(compositionTable.id, id))
    .returning({ id: compositionTable.id });
  return deleted.length > 0;
}
