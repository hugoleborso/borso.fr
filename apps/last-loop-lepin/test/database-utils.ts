import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { adminCredentialsTable, adminSessionsTable } from '../api/src/auth/auth.schema';
import { getDatabase } from '../api/src/database/client';

const ALL_TABLES: readonly string[] = [
  'loop_punches',
  'manual_dnfs',
  'runners',
  'editions',
  'auth_attempts',
  'admin_credentials',
  'admin_sessions',
];

export const TEST_ADMIN_PIN = 'lastloop';

export const TEST_ADMIN_PIN_SCRYPT_HASH =
  'scrypt$6ccc66eb93981b9b83e8817f584ca8f5$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107';

/**
 * @Blueprint test-database-isolation
 * @BlueprintName Test Database Isolation
 * @BlueprintUsage Use for giving every suite a clean database without rebuilding the schema, which is the expensive step.
 * @BlueprintDescription Names the tables in one module level list and empties them in a single `TRUNCATE ... CASCADE`, so adding a table is one line here rather than a delete statement per suite, and the ordering problems a sequence of deletes would raise never come up.
 */
export async function truncateAllTables(): Promise<void> {
  await getDatabase().execute(
    sql.raw(
      `TRUNCATE ${ALL_TABLES.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    ),
  );
}

export async function seedAdminCredentials(): Promise<void> {
  await getDatabase()
    .insert(adminCredentialsTable)
    .values({ id: 1, scryptHash: TEST_ADMIN_PIN_SCRYPT_HASH });
}

const TEST_ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// @FollowsBlueprint test-database-isolation
export async function adminSessionCookie(): Promise<string> {
  const sessionId = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + TEST_ADMIN_SESSION_TTL_MS);
  await getDatabase().insert(adminSessionsTable).values({ id: sessionId, expiresAt });
  return `lastloop_admin=${sessionId}`;
}
