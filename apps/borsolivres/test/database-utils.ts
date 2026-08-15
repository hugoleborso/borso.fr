/**
 * Helpers shared by the back-e2e suites. Every table is named once here and
 * emptied in a single statement, so adding a table is one line rather than a
 * delete per suite.
 */

import { sql } from 'drizzle-orm';
import { type Database, getDatabase } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = ['book', 'shelf'];

export function testDatabase(): Database {
  return getDatabase();
}

// @FollowsBlueprint test-database-isolation
export async function truncateAllTables(database: Database): Promise<void> {
  await database.execute(
    sql.raw(
      `TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
}
