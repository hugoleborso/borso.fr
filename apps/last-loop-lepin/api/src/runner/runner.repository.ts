import { and, eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { runnersTable } from './runner.schema';
import type { Runner } from './runner.types';

export async function insertRunner(runner: Runner): Promise<void> {
  await getDatabase().insert(runnersTable).values(runner);
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertRunner(runner: Runner): Promise<void> {
  await getDatabase().insert(runnersTable).values(runner).onConflictDoNothing();
}

export async function findRunner(editionSlug: string, runnerSlug: string): Promise<Runner | null> {
  const rows = await getDatabase()
    .select()
    .from(runnersTable)
    .where(and(eq(runnersTable.editionSlug, editionSlug), eq(runnersTable.slug, runnerSlug)))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-query
export async function listRunnersForEdition(editionSlug: string): Promise<readonly Runner[]> {
  return getDatabase().select().from(runnersTable).where(eq(runnersTable.editionSlug, editionSlug));
}
