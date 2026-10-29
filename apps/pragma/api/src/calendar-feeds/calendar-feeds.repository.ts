import { and, asc, count, eq } from 'drizzle-orm';
import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { retryingConflictAborts } from '../helpers/persistence/conflict-abort.core';
import { memberTable } from '../members/members.schema';
import type { CalendarFeedSummary, StoredCalendarFeed } from './calendar-feeds.types';
import { calendarFeedTable } from './calendar-feeds.schema';

export type AddCalendarFeedOutcome = 'saved' | 'too-many';

interface NewCalendarFeed {
  readonly memberId: string;
  readonly address: string;
  readonly name: string | null;
  readonly now: Date;
}

async function claimMemberRow(executor: DatabaseExecutor, memberId: string): Promise<void> {
  await executor
    .select({ id: memberTable.id })
    .from(memberTable)
    .where(eq(memberTable.id, memberId))
    .for('update');
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertCalendarFeed(feed: NewCalendarFeed): Promise<AddCalendarFeedOutcome> {
  return await retryingConflictAborts(
    async () =>
      await getDatabase().transaction(async (transaction) => {
        await claimMemberRow(transaction, feed.memberId);
        const [existing] = await transaction
          .select({ total: count() })
          .from(calendarFeedTable)
          .where(eq(calendarFeedTable.memberId, feed.memberId));
        const updated = await transaction
          .update(calendarFeedTable)
          .set({ name: feed.name, updatedAt: feed.now })
          .where(
            and(
              eq(calendarFeedTable.memberId, feed.memberId),
              eq(calendarFeedTable.address, feed.address),
            ),
          )
          .returning({ id: calendarFeedTable.id });
        if (updated.length > 0) return 'saved';
        if ((existing?.total ?? 0) >= CALENDAR_FEEDS_PER_MEMBER_MAX) return 'too-many';
        await transaction.insert(calendarFeedTable).values({
          memberId: feed.memberId,
          address: feed.address,
          name: feed.name,
          updatedAt: feed.now,
        });
        return 'saved';
      }),
  );
}

// @FollowsBlueprint repository-query
export async function listCalendarFeedsOfMember(memberId: string): Promise<CalendarFeedSummary[]> {
  const database = getDatabase();
  return await database
    .select({ id: calendarFeedTable.id, name: calendarFeedTable.name })
    .from(calendarFeedTable)
    .where(eq(calendarFeedTable.memberId, memberId))
    .orderBy(asc(calendarFeedTable.name), asc(calendarFeedTable.id));
}

export async function listStoredCalendarFeeds(): Promise<StoredCalendarFeed[]> {
  const database = getDatabase();
  return await database
    .select({
      memberId: calendarFeedTable.memberId,
      address: calendarFeedTable.address,
      name: calendarFeedTable.name,
    })
    .from(calendarFeedTable);
}

export async function deleteCalendarFeed(memberId: string, feedId: string): Promise<void> {
  const database = getDatabase();
  await database
    .delete(calendarFeedTable)
    .where(and(eq(calendarFeedTable.memberId, memberId), eq(calendarFeedTable.id, feedId)));
}

export async function deleteCalendarFeedsOfMember(
  memberId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<void> {
  await executor.delete(calendarFeedTable).where(eq(calendarFeedTable.memberId, memberId));
}
