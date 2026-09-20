import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { socketConnectionTable } from './realtime.schema';

export type SocketConnectionRow = typeof socketConnectionTable.$inferSelect;

export async function rememberConnection(values: {
  readonly connectionId: string;
  readonly gameId: string;
  readonly playerId: string | null;
}): Promise<void> {
  const database = getDatabase();
  await database.insert(socketConnectionTable).values(values).onConflictDoNothing();
}

export async function forgetConnection(connectionId: string): Promise<void> {
  const database = getDatabase();
  await database
    .delete(socketConnectionTable)
    .where(eq(socketConnectionTable.connectionId, connectionId));
}

export async function listConnectionsForGame(gameId: string): Promise<SocketConnectionRow[]> {
  const database = getDatabase();
  return await database
    .select()
    .from(socketConnectionTable)
    .where(eq(socketConnectionTable.gameId, gameId));
}
