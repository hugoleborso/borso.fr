import { and, eq, gt, lt } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { adminCredentialsTable, adminSessionsTable, authAttemptsTable } from './auth.schema';

const ADMIN_CREDENTIAL_ROW_ID = 1;

export interface RateLimitBucket {
  readonly ipAddress: string;
  readonly count: number;
  readonly windowStartedAt: Date;
}

export async function findBucket(ipAddress: string): Promise<RateLimitBucket | null> {
  const rows = await getDatabase()
    .select()
    .from(authAttemptsTable)
    .where(eq(authAttemptsTable.ipAddress, ipAddress))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertBucket(bucket: RateLimitBucket): Promise<void> {
  await getDatabase()
    .insert(authAttemptsTable)
    .values(bucket)
    .onConflictDoUpdate({
      target: authAttemptsTable.ipAddress,
      set: { count: bucket.count, windowStartedAt: bucket.windowStartedAt },
    });
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
