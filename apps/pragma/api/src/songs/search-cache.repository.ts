import { and, eq, gt } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import type { ExternalSongHit } from './musicbrainz.core';
import { externalSearchCacheTable } from './songs.schema';

export interface CachedSearchInsertShape {
  normalizedQuery: string;
  hits: readonly ExternalSongHit[];
  expiresAt: Date;
}

// @FollowsBlueprint repository-query
export async function findFreshCachedSearch(
  normalizedQuery: string,
  now: Date,
): Promise<string | null> {
  const rows = await getDatabase()
    .select({ hits: externalSearchCacheTable.hits })
    .from(externalSearchCacheTable)
    .where(
      and(
        eq(externalSearchCacheTable.normalizedQuery, normalizedQuery),
        gt(externalSearchCacheTable.expiresAt, now),
      ),
    )
    .limit(1);
  return rows[0]?.hits ?? null;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertCachedSearch(values: CachedSearchInsertShape): Promise<void> {
  const columns = {
    normalizedQuery: values.normalizedQuery,
    hits: JSON.stringify(values.hits),
    expiresAt: values.expiresAt,
  };
  await getDatabase()
    .insert(externalSearchCacheTable)
    .values(columns)
    .onConflictDoUpdate({ target: externalSearchCacheTable.normalizedQuery, set: columns });
}
