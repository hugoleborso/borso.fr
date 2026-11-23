import { eq, lt } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import {
  accountTable,
  appSecretTable,
  passkeyTable,
  webauthnChallengeTable,
} from './accounts.schema';

export type AccountRow = typeof accountTable.$inferSelect;
export type PasskeyRow = typeof passkeyTable.$inferSelect;
export type ChallengeRow = typeof webauthnChallengeTable.$inferSelect;

const APP_SECRET_ID = 1;

// @FollowsBlueprint repository-query
export async function findAccount(accountId: string): Promise<AccountRow | null> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(accountTable)
    .where(eq(accountTable.id, accountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPasskey(credentialId: string): Promise<PasskeyRow | null> {
  const database = getDatabase();
  const rows = await database
    .select()
    .from(passkeyTable)
    .where(eq(passkeyTable.credentialId, credentialId))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-write-refused-by-the-primary-key
export async function claimHmacKey(candidate: Buffer, now: Date): Promise<Buffer> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    const written = await transaction
      .insert(appSecretTable)
      .values({ id: APP_SECRET_ID, hmacKey: candidate, createdAt: now })
      .onConflictDoNothing()
      .returning({ hmacKey: appSecretTable.hmacKey });
    const own = written[0];
    if (own !== undefined) return own.hmacKey;
    const [stored] = await transaction
      .select({ hmacKey: appSecretTable.hmacKey })
      .from(appSecretTable)
      .where(eq(appSecretTable.id, APP_SECRET_ID));
    if (stored === undefined) throw new Error('the session key was neither written nor found');
    return stored.hmacKey;
  });
}

export async function findHmacKey(): Promise<Buffer | null> {
  const database = getDatabase();
  const rows = await database
    .select({ hmacKey: appSecretTable.hmacKey })
    .from(appSecretTable)
    .where(eq(appSecretTable.id, APP_SECRET_ID))
    .limit(1);
  return rows[0]?.hmacKey ?? null;
}

export async function insertChallenge(values: ChallengeRow, now: Date): Promise<void> {
  const database = getDatabase();
  await database.delete(webauthnChallengeTable).where(lt(webauthnChallengeTable.expiresAt, now));
  await database.insert(webauthnChallengeTable).values(values);
}

export async function takeChallenge(challenge: string): Promise<ChallengeRow | null> {
  const database = getDatabase();
  const [row] = await database
    .delete(webauthnChallengeTable)
    .where(eq(webauthnChallengeTable.challenge, challenge))
    .returning();
  return row ?? null;
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await getDatabase().transaction(work);
}

export async function insertAccount(
  executor: DatabaseExecutor,
  account: AccountRow,
): Promise<AccountRow> {
  const [row] = await executor.insert(accountTable).values(account).returning();
  if (row === undefined) throw new Error('insert returned no account row');
  return row;
}

export async function insertPasskey(
  executor: DatabaseExecutor,
  passkey: PasskeyRow,
): Promise<void> {
  await executor.insert(passkeyTable).values(passkey);
}

export async function updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
  const database = getDatabase();
  await database
    .update(passkeyTable)
    .set({ counter })
    .where(eq(passkeyTable.credentialId, credentialId));
}
