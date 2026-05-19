/**
 * Helpers shared by back-e2e tests. Truncates every table before each
 * test so suites stay isolated against the shared Postgres.
 */

import { sql } from 'drizzle-orm';
import { type Database, getDatabase } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'app_config',
  'auth_attempt',
  'bar',
  'transition_comment',
  'setlist_entry',
  'setlist',
  'session',
  'mastery_override',
  'mastery_default',
  'song',
  'instrument',
  'member',
];

export function testDatabase(): Database {
  return getDatabase();
}

export async function truncateAllTables(database: Database): Promise<void> {
  await database.execute(
    sql.raw(
      `TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
}
