import { eq } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import type { StoredCalendarFeed } from './calendar-feeds.types';
import { memberCalendarFeedTable } from './calendar-feeds.schema';

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertCalendarFeed(
  memberId: string,
  address: string,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(memberCalendarFeedTable)
    .values({ memberId, address, updatedAt: now })
    .onConflictDoUpdate({
      target: memberCalendarFeedTable.memberId,
      set: { address, updatedAt: now },
    });
}

// @FollowsBlueprint repository-query
export async function hasCalendarFeed(memberId: string): Promise<boolean> {
  const database = getDatabase();
  const rows = await database
    .select({ memberId: memberCalendarFeedTable.memberId })
    .from(memberCalendarFeedTable)
    .where(eq(memberCalendarFeedTable.memberId, memberId))
    .limit(1);
  return rows.length > 0;
}

export async function listStoredCalendarFeeds(): Promise<StoredCalendarFeed[]> {
  const database = getDatabase();
  return await database
    .select({
      memberId: memberCalendarFeedTable.memberId,
      address: memberCalendarFeedTable.address,
    })
    .from(memberCalendarFeedTable);
}

export async function deleteCalendarFeed(
  memberId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<void> {
  await executor
    .delete(memberCalendarFeedTable)
    .where(eq(memberCalendarFeedTable.memberId, memberId));
}
