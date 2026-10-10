import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { adminCredentialsTable, adminSessionsTable, authAttemptsTable } from './auth.schema';

const ADMIN_CREDENTIAL_ROW_ID = 1;

export interface RateLimitBucket {
  readonly ipAddress: string;
  readonly count: number;
  readonly windowStartedAt: Date;
}

// @FollowsBlueprint repository-atomic-counter
export async function incrementBucket(
  ipAddress: string,
  now: Date,
  windowFloor: Date,
): Promise<RateLimitBucket> {
  const isWindowExpired = sql`${authAttemptsTable.windowStartedAt} <= ${windowFloor.toISOString()}::timestamptz`;
  const rows = await getDatabase()
    .insert(authAttemptsTable)
    .values({ ipAddress, count: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: authAttemptsTable.ipAddress,
      set: {
        count: sql`CASE WHEN ${isWindowExpired} THEN 1 ELSE ${authAttemptsTable.count} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${isWindowExpired} THEN ${now.toISOString()}::timestamptz ELSE ${authAttemptsTable.windowStartedAt} END`,
      },
    })
    .returning({
      ipAddress: authAttemptsTable.ipAddress,
      count: authAttemptsTable.count,
      windowStartedAt: authAttemptsTable.windowStartedAt,
    });
  const row = rows[0];
  if (row === undefined) throw new Error('auth_attempts upsert returned no row');
  return row;
}

export async function deleteBucket(ipAddress: string): Promise<void> {
  await getDatabase().delete(authAttemptsTable).where(eq(authAttemptsTable.ipAddress, ipAddress));
}

export async function deleteAllBuckets(): Promise<void> {
  await getDatabase().delete(authAttemptsTable);
}

export async function findAdminPinHash(): Promise<string | null> {
  const rows = await getDatabase()
    .select({ scryptHash: adminCredentialsTable.scryptHash })
    .from(adminCredentialsTable)
    .where(eq(adminCredentialsTable.id, ADMIN_CREDENTIAL_ROW_ID))
    .limit(1);
  return rows[0]?.scryptHash ?? null;
}

export interface AdminSession {
  readonly id: string;
  readonly expiresAt: Date;
}

export async function createSession(session: AdminSession): Promise<void> {
  await getDatabase().insert(adminSessionsTable).values(session);
}

// @FollowsBlueprint repository-query
export async function findValidSession(id: string, now: Date): Promise<AdminSession | null> {
  const rows = await getDatabase()
    .select({ id: adminSessionsTable.id, expiresAt: adminSessionsTable.expiresAt })
    .from(adminSessionsTable)
    .where(and(eq(adminSessionsTable.id, id), gt(adminSessionsTable.expiresAt, now)))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await getDatabase().delete(adminSessionsTable).where(eq(adminSessionsTable.id, id));
}

export async function purgeExpiredSessions(now: Date): Promise<void> {
  await getDatabase().delete(adminSessionsTable).where(lt(adminSessionsTable.expiresAt, now));
}
