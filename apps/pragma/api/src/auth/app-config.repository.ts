/**
 * Repository for the `app_config` singleton row. ADR-0004 — the
 * password hash + HMAC signing key live here, not in AWS Secrets
 * Manager. The CHECK constraint `id = 1` is the singleton guard at the
 * database level.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { appConfigTable } from '../database/schema';

export interface AppConfig {
  passwordHash: string;
  hmacKey: Buffer;
  rotatedAt: Date;
}

const SINGLETON_ID = 1;

export async function loadAppConfig(database: Database): Promise<AppConfig | null> {
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
  database: Database,
  passwordHash: string,
  hmacKey: Buffer,
  now: Date,
): Promise<void> {
  await database.insert(appConfigTable).values({
    id: SINGLETON_ID,
    passwordHash,
    hmacKey,
    rotatedAt: now,
  });
}

export async function updateAppConfig(
  database: Database,
  passwordHash: string,
  hmacKey: Buffer,
  now: Date,
): Promise<void> {
  await database
    .update(appConfigTable)
    .set({ passwordHash, hmacKey, rotatedAt: now })
    .where(eq(appConfigTable.id, SINGLETON_ID));
}
