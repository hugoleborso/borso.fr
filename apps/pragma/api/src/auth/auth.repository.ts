import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { appConfigTable } from './auth.schema';

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
