import { and, eq, lt } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import {
  memberCredentialTable,
  memberPasskeyTable,
  webauthnChallengeTable,
} from './credentials.schema';

export type CredentialRow = Omit<typeof memberCredentialTable.$inferSelect, 'createdAt'>;

export type PasskeyRow = typeof memberPasskeyTable.$inferSelect;

// @FollowsBlueprint repository-projection
const CREDENTIAL_PROJECTION = {
  memberId: memberCredentialTable.memberId,
  username: memberCredentialTable.username,
  passwordHash: memberCredentialTable.passwordHash,
  sessionEpoch: memberCredentialTable.sessionEpoch,
} as const;

const PASSKEY_PROJECTION = {
  id: memberPasskeyTable.id,
  memberId: memberPasskeyTable.memberId,
  credentialId: memberPasskeyTable.credentialId,
  publicKey: memberPasskeyTable.publicKey,
  signCounter: memberPasskeyTable.signCounter,
  transports: memberPasskeyTable.transports,
  label: memberPasskeyTable.label,
  createdAt: memberPasskeyTable.createdAt,
} as const;

// @FollowsBlueprint repository-query
export async function listCredentials(): Promise<CredentialRow[]> {
  const database = getDatabase();
  return await database.select(CREDENTIAL_PROJECTION).from(memberCredentialTable);
}

export async function findCredentialByUsername(username: string): Promise<CredentialRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(CREDENTIAL_PROJECTION)
    .from(memberCredentialTable)
    .where(eq(memberCredentialTable.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function findCredentialByMemberId(memberId: string): Promise<CredentialRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(CREDENTIAL_PROJECTION)
    .from(memberCredentialTable)
    .where(eq(memberCredentialTable.memberId, memberId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertCredential(values: {
  memberId: string;
  username: string;
  passwordHash: string;
  sessionEpoch: number;
  createdAt: Date;
}): Promise<void> {
  const database = getDatabase();
  await database.insert(memberCredentialTable).values(values);
}

export async function updateCredentialSecret(
  memberId: string,
  passwordHash: string,
  sessionEpoch: number,
): Promise<void> {
  const database = getDatabase();
  await database
    .update(memberCredentialTable)
    .set({ passwordHash, sessionEpoch })
    .where(eq(memberCredentialTable.memberId, memberId));
}

export async function deleteCredentialsForMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(memberCredentialTable).where(eq(memberCredentialTable.memberId, memberId));
  await executor.delete(memberPasskeyTable).where(eq(memberPasskeyTable.memberId, memberId));
}

export async function listPasskeysForMember(memberId: string): Promise<PasskeyRow[]> {
  const database = getDatabase();
  return await database
    .select(PASSKEY_PROJECTION)
    .from(memberPasskeyTable)
    .where(eq(memberPasskeyTable.memberId, memberId));
}

export async function findPasskeyByCredentialId(credentialId: string): Promise<PasskeyRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PASSKEY_PROJECTION)
    .from(memberPasskeyTable)
    .where(eq(memberPasskeyTable.credentialId, credentialId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPasskey(values: {
  memberId: string;
  credentialId: string;
  publicKey: Buffer;
  signCounter: number;
  transports: string;
  label: string;
  createdAt: Date;
}): Promise<void> {
  const database = getDatabase();
  await database.insert(memberPasskeyTable).values(values);
}

export async function updatePasskeyCounter(
  credentialId: string,
  signCounter: number,
): Promise<void> {
  const database = getDatabase();
  await database
    .update(memberPasskeyTable)
    .set({ signCounter })
    .where(eq(memberPasskeyTable.credentialId, credentialId));
}

export async function deletePasskey(memberId: string, passkeyId: string): Promise<number> {
  const database = getDatabase();
  const deleted = await database
    .delete(memberPasskeyTable)
    .where(and(eq(memberPasskeyTable.memberId, memberId), eq(memberPasskeyTable.id, passkeyId)))
    .returning({ id: memberPasskeyTable.id });
  return deleted.length;
}

export async function insertChallenge(values: {
  challenge: string;
  memberId: string | null;
  expiresAt: Date;
}): Promise<void> {
  const database = getDatabase();
  await database.insert(webauthnChallengeTable).values(values);
}

export async function takeChallenge(
  challenge: string,
): Promise<{ challenge: string; memberId: string | null; expiresAt: Date } | null> {
  const database = getDatabase();
  const deleted = await database
    .delete(webauthnChallengeTable)
    .where(eq(webauthnChallengeTable.challenge, challenge))
    .returning({
      challenge: webauthnChallengeTable.challenge,
      memberId: webauthnChallengeTable.memberId,
      expiresAt: webauthnChallengeTable.expiresAt,
    });
  return deleted[0] ?? null;
}

export async function deleteExpiredChallenges(now: Date): Promise<void> {
  const database = getDatabase();
  await database.delete(webauthnChallengeTable).where(lt(webauthnChallengeTable.expiresAt, now));
}
