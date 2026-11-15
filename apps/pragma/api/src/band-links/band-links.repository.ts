import { asc, eq } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type BandLink, bandLinkTable } from './band-links.schema';

// @FollowsBlueprint repository-owned-transaction
export async function runInOneBandLinkTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function listBandLinksOldestFirst(): Promise<BandLink[]> {
  return await getDatabase()
    .select()
    .from(bandLinkTable)
    .orderBy(asc(bandLinkTable.createdAt), asc(bandLinkTable.id));
}

// @FollowsBlueprint repository-idempotent-upsert
export async function insertBandLinkOnceWithin(
  executor: DatabaseExecutor,
  bandLink: BandLink,
): Promise<void> {
  await executor.insert(bandLinkTable).values(bandLink).onConflictDoNothing();
}

export async function findBandLinkWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<BandLink | null> {
  const [row] = await executor
    .select()
    .from(bandLinkTable)
    .where(eq(bandLinkTable.id, id))
    .limit(1);
  return row ?? null;
}

export async function didDeleteBandLink(id: string): Promise<boolean> {
  const deleted = await getDatabase()
    .delete(bandLinkTable)
    .where(eq(bandLinkTable.id, id))
    .returning({ id: bandLinkTable.id });
  return deleted.length > 0;
}
