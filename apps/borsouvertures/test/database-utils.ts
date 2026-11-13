import postgres from 'postgres';

const TRUNCATED_TABLES = ['review_event', 'sign_in_attempt', 'operator_credential', 'app_config'];

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

export async function countReviewEvents(): Promise<number> {
  const rows = await testSql()<{ total: number }[]>`
    SELECT count(*)::int AS total FROM review_event`;
  return rows[0]?.total ?? 0;
}

export async function listReceivedInstants(): Promise<readonly string[]> {
  const rows = await testSql()<{ id: string; received_at: Date }[]>`
    SELECT id, received_at FROM review_event ORDER BY received_at, id`;
  return rows.map((row) => `${row.id} ${row.received_at.toISOString()}`);
}

export async function listSignInAttemptCounts(): Promise<readonly number[]> {
  const rows = await testSql()<{ attempt_count: number }[]>`
    SELECT attempt_count FROM sign_in_attempt ORDER BY address_hash`;
  return rows.map((row) => row.attempt_count);
}
