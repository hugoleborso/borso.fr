import { eq, ne } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { realtimeConnectionTable } from './realtime.schema';

export type RealtimeConnectionRow = typeof realtimeConnectionTable.$inferSelect;

// @FollowsBlueprint repository-query
export async function rememberConnection(values: {
  readonly connectionId: string;
  readonly memberId: string;
  readonly clientId: string;
}): Promise<void> {
  const database = getDatabase();
  await database.insert(realtimeConnectionTable).values(values).onConflictDoNothing();
}

export async function forgetConnection(connectionId: string): Promise<void> {
  const database = getDatabase();
  await database
    .delete(realtimeConnectionTable)
    .where(eq(realtimeConnectionTable.connectionId, connectionId));
}

export async function listConnectionsOutsideClient(
  clientId: string | null,
): Promise<RealtimeConnectionRow[]> {
  const database = getDatabase();
  const query = database.select().from(realtimeConnectionTable);
  if (clientId === null) return await query;
  return await query.where(ne(realtimeConnectionTable.clientId, clientId));
}
