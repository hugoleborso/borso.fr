import { and, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { runnersTable } from './runner.schema';
import type { Runner } from './runner.types';

export async function insertRunner(database: Database, runner: Runner): Promise<void> {
  await database.insert(runnersTable).values(runner);
}

/**
 * Write a runner, leaving the existing row untouched when the edition and
 * slug pair is already present. Used by the test seeding endpoint, which
 * replays the same roster on every fixture switch.
 */
export async function upsertRunner(database: Database, runner: Runner): Promise<void> {
  await database.insert(runnersTable).values(runner).onConflictDoNothing();
}

export async function findRunner(
  database: Database,
  editionSlug: string,
  runnerSlug: string,
): Promise<Runner | null> {
  const rows = await database
    .select()
    .from(runnersTable)
    .where(and(eq(runnersTable.editionSlug, editionSlug), eq(runnersTable.slug, runnerSlug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRunnersForEdition(
  database: Database,
  editionSlug: string,
): Promise<readonly Runner[]> {
  return database.select().from(runnersTable).where(eq(runnersTable.editionSlug, editionSlug));
}
