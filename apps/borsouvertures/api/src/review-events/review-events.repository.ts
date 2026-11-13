import { and, asc, eq, gt, inArray, or } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type ReviewEventRow, reviewEventTable } from './review-events.schema';

// @FollowsBlueprint repository-idempotent-upsert
export async function insertReviewEventsUnlessStored(
  rows: readonly ReviewEventRow[],
): Promise<void> {
  await getDatabase()
    .insert(reviewEventTable)
    .values([...rows])
    .onConflictDoNothing({ target: reviewEventTable.id });
}

// @FollowsBlueprint repository-query
export async function listReceivedAtByIds(
  ids: readonly string[],
): Promise<Pick<ReviewEventRow, 'id' | 'receivedAt'>[]> {
  return await getDatabase()
    .select({ id: reviewEventTable.id, receivedAt: reviewEventTable.receivedAt })
    .from(reviewEventTable)
    .where(inArray(reviewEventTable.id, [...ids]));
}

export async function listReviewEventsAfter(
  floor: { readonly receivedAt: Date; readonly id: string },
  limit: number,
): Promise<ReviewEventRow[]> {
  return await getDatabase()
    .select()
    .from(reviewEventTable)
    .where(
      or(
        gt(reviewEventTable.receivedAt, floor.receivedAt),
        and(eq(reviewEventTable.receivedAt, floor.receivedAt), gt(reviewEventTable.id, floor.id)),
      ),
    )
    .orderBy(asc(reviewEventTable.receivedAt), asc(reviewEventTable.id))
    .limit(limit);
}
