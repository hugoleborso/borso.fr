import { sql } from 'drizzle-orm';
import { getDatabase } from '../api/src/database/client';

const ALL_TABLES = [
  'auth_attempt',
  'passkey',
  'push_subscription',
  'session',
  'webauthn_challenge',
];

// @FollowsBlueprint test-database-isolation
export async function truncateAllTables(): Promise<void> {
  await getDatabase().execute(
    sql.raw(`TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} CASCADE`),
  );
}
