import { eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { authAttemptsTable } from './auth.schema';

export interface RateLimitBucket {
  readonly ipAddress: string;
  readonly count: number;
  readonly windowStartedAt: Date;
}

export async function findBucket(database: Database, ipAddress: string): Promise<RateLimitBucket | null> {
  const rows = await database
    .select()
    .from(authAttemptsTable)
    .where(eq(authAttemptsTable.ipAddress, ipAddress))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBucket(database: Database, bucket: RateLimitBucket): Promise<void> {
  await database
    .insert(authAttemptsTable)
    .values(bucket)
    .onConflictDoUpdate({
      target: authAttemptsTable.ipAddress,
      set: { count: bucket.count, windowStartedAt: bucket.windowStartedAt },
    });
}
