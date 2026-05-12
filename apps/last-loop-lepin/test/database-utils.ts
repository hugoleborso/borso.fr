/**
 * Helpers shared by integration tests. Truncates every table before each
 * test so suites stay isolated against the shared testcontainer Postgres.
 *
 * Reuses the module-scoped Drizzle singleton (`getDatabase()`) instead of
 * destroying it per test — `resetDatabaseForTests()` would terminate
 * in-flight queries from other tests when vitest serialises files.
 */

import { sql } from 'drizzle-orm';
import { getDatabase, type Database } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'loop_punches',
  'manual_dnfs',
  'runners',
  'editions',
  'auth_attempts',
];

export function testDatabase(): Database {
  return getDatabase();
}

/** @deprecated Kept for migration; prefer `testDatabase()`. */
export function freshDatabase(): Database {
  return getDatabase();
}

export async function truncateAllTables(database: Database): Promise<void> {
  await database.execute(
    sql.raw(`TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`),
  );
}
