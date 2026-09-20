import postgres from 'postgres';

const TRUNCATED_TABLES = ['bid', 'round_result', 'socket_connection', 'player', 'game'];

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
