import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { getDatabase } from '@api/database/client';

const TRUNCATED_TABLES = [
  'bid',
  'round_result',
  'socket_connection',
  'seat_claim',
  'avatar_claim',
  'player',
  'game',
];

let cachedSql: ReturnType<typeof postgres> | null = null;

function testSql(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL is not set in the back-e2e suite');
  cachedSql ??= postgres(url, { onnotice: () => undefined });
  return cachedSql;
}

// @FollowsBlueprint test-database-isolation
export async function truncateAllTables(): Promise<void> {
  await testSql().unsafe(`TRUNCATE ${TRUNCATED_TABLES.join(', ')} CASCADE`);
}

const CONCURRENT_CONNECTIONS_TO_OPEN = 6;

export async function openConnectionsForConcurrentRequests(): Promise<void> {
  const database = getDatabase();
  await Promise.all(
    Array.from({ length: CONCURRENT_CONNECTIONS_TO_OPEN }, () => database.execute(sql`SELECT 1`)),
  );
}

export async function listSeatOrders(joinCode: string): Promise<readonly number[]> {
  const rows = await testSql()<{ seat_order: number }[]>`
    SELECT player.seat_order FROM player
    JOIN game ON game.id = player.game_id
    WHERE game.join_code = ${joinCode}
    ORDER BY player.seat_order`;
  return rows.map((row) => row.seat_order);
}
