import { eq, sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { appConfigTable, authAttemptTable } from './auth.schema';

export interface AppConfig {
  passwordHash: string;
  hmacKey: Buffer;
  rotatedAt: Date;
}

const SINGLETON_ID = 1;

// @FollowsBlueprint repository-query
export async function loadAppConfig(): Promise<AppConfig | null> {
  const database = getDatabase();
  const rows = await database
    .select({
      passwordHash: appConfigTable.passwordHash,
      hmacKey: appConfigTable.hmacKey,
      rotatedAt: appConfigTable.rotatedAt,
    })
    .from(appConfigTable)
    .where(eq(appConfigTable.id, SINGLETON_ID))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return null;
  return row;
}

export async function insertInitialAppConfig(
  passwordHash: string,
  hmacKey: Buffer,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database.insert(appConfigTable).values({
    id: SINGLETON_ID,
    passwordHash,
    hmacKey,
    rotatedAt: now,
  });
}

export async function updateAppConfig(
  passwordHash: string,
  hmacKey: Buffer,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .update(appConfigTable)
    .set({ passwordHash, hmacKey, rotatedAt: now })
    .where(eq(appConfigTable.id, SINGLETON_ID));
}

export interface AttemptBucketRow {
  readonly count: number;
  readonly windowStartedAt: Date;
}

/**
 * @Blueprint repository-atomic-counter
 * @BlueprintName Repository Atomic Counter
 * @BlueprintUsage Use for a counter many requests bump at once, such as a rate-limit bucket, where reading the row and writing it back would let two requests count once.
 * @BlueprintDescription Does the read, the window decision and the write in one `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement, with the window test written as a `CASE` over the stored row, so two concurrent requests can never both see the old count. The service hands in the window floor already computed, which keeps the clock out of SQL. On Postgres the conflicting row is locked; on Aurora DSQL a concurrent writer fails its commit instead, which refuses that request rather than letting it through uncounted. The returned row is the state after this request, so the caller decides from what was written rather than from what it read.
 */
export async function incrementAttemptBucket(
  bucketKey: string,
  now: Date,
  windowFloor: Date,
): Promise<AttemptBucketRow> {
  const isWindowExpired = sql`${authAttemptTable.windowStartedAt} <= ${windowFloor.toISOString()}::timestamptz`;
  const rows = await getDatabase()
    .insert(authAttemptTable)
    .values({ ipHash: bucketKey, count: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: authAttemptTable.ipHash,
      set: {
        count: sql`CASE WHEN ${isWindowExpired} THEN 1 ELSE ${authAttemptTable.count} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${isWindowExpired} THEN ${now.toISOString()}::timestamptz ELSE ${authAttemptTable.windowStartedAt} END`,
      },
    })
    .returning({
      count: authAttemptTable.count,
      windowStartedAt: authAttemptTable.windowStartedAt,
    });
  const row = rows[0];
  if (row === undefined) throw new Error('auth_attempt upsert returned no row');
  return row;
}

export async function deleteAttemptBucket(bucketKey: string): Promise<void> {
  await getDatabase().delete(authAttemptTable).where(eq(authAttemptTable.ipHash, bucketKey));
}

export async function deleteAllAttemptBuckets(): Promise<void> {
  await getDatabase().delete(authAttemptTable);
}
