import { eq, sql } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { appConfigTable, operatorCredentialTable, signInAttemptTable } from './auth.schema';

export interface OperatorCredential {
  readonly id: string;
  readonly passwordHash: string;
  readonly sessionEpoch: number;
}

export interface SignInAttemptRow {
  readonly attemptCount: number;
  readonly windowStartedAt: Date;
}

// @FollowsBlueprint repository-query
export async function findOperatorCredential(
  credentialId: string,
): Promise<OperatorCredential | null> {
  const rows = await getDatabase()
    .select({
      id: operatorCredentialTable.id,
      passwordHash: operatorCredentialTable.passwordHash,
      sessionEpoch: operatorCredentialTable.sessionEpoch,
    })
    .from(operatorCredentialTable)
    .where(eq(operatorCredentialTable.id, credentialId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findSigningKey(signingKeyId: string): Promise<string | null> {
  const rows = await getDatabase()
    .select({ hmacKey: appConfigTable.hmacKey })
    .from(appConfigTable)
    .where(eq(appConfigTable.id, signingKeyId))
    .limit(1);
  return rows[0]?.hmacKey ?? null;
}

// @FollowsBlueprint repository-atomic-counter
export async function incrementSignInAttempts(
  addressHash: string,
  now: Date,
  windowFloor: Date,
): Promise<SignInAttemptRow> {
  const isWindowExpired = sql`${signInAttemptTable.windowStartedAt} <= ${windowFloor.toISOString()}::timestamptz`;
  const rows = await getDatabase()
    .insert(signInAttemptTable)
    .values({ addressHash, attemptCount: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: signInAttemptTable.addressHash,
      set: {
        attemptCount: sql`CASE WHEN ${isWindowExpired} THEN 1 ELSE ${signInAttemptTable.attemptCount} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${isWindowExpired} THEN ${now.toISOString()}::timestamptz ELSE ${signInAttemptTable.windowStartedAt} END`,
      },
    })
    .returning({
      attemptCount: signInAttemptTable.attemptCount,
      windowStartedAt: signInAttemptTable.windowStartedAt,
    });
  const row = rows[0];
  if (row === undefined) throw new Error('sign_in_attempt upsert returned no row');
  return row;
}

export async function deleteSignInAttempts(addressHash: string): Promise<void> {
  await getDatabase()
    .delete(signInAttemptTable)
    .where(eq(signInAttemptTable.addressHash, addressHash));
}
