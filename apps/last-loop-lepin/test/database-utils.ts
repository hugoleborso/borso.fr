/**
 * Helpers shared by integration tests. Truncates every table before each
 * test so suites stay isolated against the shared testcontainer Postgres.
 *
 * Reuses the module-scoped Drizzle singleton (`getDatabase()`) instead of
 * destroying it per test — `resetDatabaseForTests()` would terminate
 * in-flight queries from other tests when vitest serialises files.
 */

import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { adminCredentialsTable, adminSessionsTable } from '../api/src/auth/auth.schema';
import { getDatabase, type Database } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'loop_punches',
  'manual_dnfs',
  'runners',
  'editions',
  'auth_attempts',
  'admin_credentials',
  'admin_sessions',
];

/**
 * scrypt hash of the literal string `'lastloop'`. Re-used across every
 * test that exercises the login flow; the test seeds it into
 * `admin_credentials` via `seedAdminCredentials()` before each case.
 */
export const TEST_ADMIN_PIN_SCRYPT_HASH =
  'scrypt$6ccc66eb93981b9b83e8817f584ca8f5$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107';

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

/**
 * Inserts the test PIN hash into `admin_credentials` so subsequent
 * login attempts can succeed. The runtime `login` function reads from
 * this table — there is no longer a `PIN_HASH` env var to set.
 */
export async function seedAdminCredentials(database: Database): Promise<void> {
  await database
    .insert(adminCredentialsTable)
    .values({ id: 1, scryptHash: TEST_ADMIN_PIN_SCRYPT_HASH });
}

const TEST_ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Seeds an admin session row and returns the `Cookie:`-ready value
 * controller tests use to hit admin routes (`lastloop_admin=<id>`).
 * Replaces the old `signAdminSession()` JWT helper now that admin
 * sessions live in the DB. Defaults to a random session id per call
 * so the helper can be invoked multiple times in a single test without
 * primary-key conflicts.
 */
export async function adminSessionCookie(database: Database): Promise<string> {
  const sessionId = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + TEST_ADMIN_SESSION_TTL_MS);
  await database.insert(adminSessionsTable).values({ id: sessionId, expiresAt });
  return `lastloop_admin=${sessionId}`;
}
