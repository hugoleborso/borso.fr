import { eq, gte } from 'drizzle-orm';
import type { CalendarDay } from '@domain/paris-day.core';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { presenceTable } from './streaks.schema';
import type { PresenceRow } from './streaks.types';

// @FollowsBlueprint repository-projection
const PRESENCE_PROJECTION = {
  memberId: presenceTable.memberId,
  presentOn: presenceTable.presentOn,
} as const;

// @FollowsBlueprint repository-idempotent-upsert
export async function insertPresenceIfAbsent(
  presence: PresenceRow,
  createdAt: Date,
): Promise<void> {
  await getDatabase()
    .insert(presenceTable)
    .values({ ...presence, createdAt })
    .onConflictDoNothing();
}

export async function listPresencesSince(firstDay: CalendarDay): Promise<PresenceRow[]> {
  return await getDatabase()
    .select(PRESENCE_PROJECTION)
    .from(presenceTable)
    .where(gte(presenceTable.presentOn, firstDay));
}

export async function deletePresencesOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(presenceTable).where(eq(presenceTable.memberId, memberId));
}
