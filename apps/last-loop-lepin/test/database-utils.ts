/**
 * Helpers shared by integration tests. Truncates every table before each
 * test so suites stay isolated against the shared testcontainer Postgres.
 */

import { sql } from 'drizzle-orm';
import { getDatabase, resetDatabaseForTests, type Database } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'loop_punches',
  'manual_dnfs',
  'runners',
  'editions',
  'auth_attempts',
];

export function freshDatabase(): Database {
  resetDatabaseForTests();
  return getDatabase();
}

export async function truncateAllTables(database: Database): Promise<void> {
  await database.execute(sql.raw(`TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`));
}
