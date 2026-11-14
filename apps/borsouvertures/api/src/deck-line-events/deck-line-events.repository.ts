import { and, asc, eq, gt, inArray, or } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeckLineEventRow, deckLineEventTable } from './deck-line-events.schema';

// @FollowsBlueprint repository-idempotent-upsert
export async function insertDeckLineEventsUnlessStored(
  rows: readonly DeckLineEventRow[],
): Promise<void> {
  await getDatabase()
    .insert(deckLineEventTable)
    .values([...rows])
    .onConflictDoNothing({ target: deckLineEventTable.id });
}

// @FollowsBlueprint repository-query
export async function listDeckLineReceivedAtByIds(
  ids: readonly string[],
): Promise<Pick<DeckLineEventRow, 'id' | 'receivedAt'>[]> {
  return await getDatabase()
    .select({ id: deckLineEventTable.id, receivedAt: deckLineEventTable.receivedAt })
    .from(deckLineEventTable)
    .where(inArray(deckLineEventTable.id, [...ids]));
}

export async function listDeckLineEventsAfter(
  floor: { readonly receivedAt: Date; readonly id: string },
  limit: number,
): Promise<DeckLineEventRow[]> {
  return await getDatabase()
    .select()
    .from(deckLineEventTable)
    .where(
      or(
        gt(deckLineEventTable.receivedAt, floor.receivedAt),
        and(
          eq(deckLineEventTable.receivedAt, floor.receivedAt),
          gt(deckLineEventTable.id, floor.id),
        ),
      ),
    )
    .orderBy(asc(deckLineEventTable.receivedAt), asc(deckLineEventTable.id))
    .limit(limit);
}
