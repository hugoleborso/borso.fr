import { asc, count, eq, lt } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import {
  authAttemptTable,
  passkeyTable,
  sessionTable,
  webauthnChallengeTable,
} from './auth.schema';

export type PasskeyRow = typeof passkeyTable.$inferSelect;
export type ChallengeRow = typeof webauthnChallengeTable.$inferSelect;
export type SessionRow = typeof sessionTable.$inferSelect;
export type AttemptRow = typeof authAttemptTable.$inferSelect;

// @FollowsBlueprint repository-query
export async function listPasskeys(): Promise<PasskeyRow[]> {
  return await getDatabase().select().from(passkeyTable).orderBy(asc(passkeyTable.createdAt));
}

export async function countPasskeys(): Promise<number> {
  const rows = await getDatabase().select({ total: count() }).from(passkeyTable);
  return rows[0]?.total ?? 0;
}

export async function findPasskeyByCredentialId(credentialId: string): Promise<PasskeyRow | null> {
  const rows = await getDatabase()
    .select()
    .from(passkeyTable)
    .where(eq(passkeyTable.credentialId, credentialId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPasskeyById(id: string): Promise<PasskeyRow | null> {
  const rows = await getDatabase()
    .select()
    .from(passkeyTable)
    .where(eq(passkeyTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deletePasskey(id: string): Promise<void> {
  await getDatabase().delete(passkeyTable).where(eq(passkeyTable.id, id));
}

export async function insertPasskey(values: typeof passkeyTable.$inferInsert): Promise<void> {
  await getDatabase().insert(passkeyTable).values(values);
}

export async function updatePasskeyCounter(
  credentialId: string,
  signCounter: number,
): Promise<void> {
  await getDatabase()
    .update(passkeyTable)
    .set({ signCounter })
    .where(eq(passkeyTable.credentialId, credentialId));
}

export async function insertChallenge(values: ChallengeRow): Promise<void> {
  await getDatabase().insert(webauthnChallengeTable).values(values);
}

export async function takeChallenge(challenge: string): Promise<ChallengeRow | null> {
  const deleted = await getDatabase()
    .delete(webauthnChallengeTable)
    .where(eq(webauthnChallengeTable.challenge, challenge))
    .returning();
  return deleted[0] ?? null;
}

export async function deleteExpiredChallenges(now: Date): Promise<void> {
  await getDatabase()
    .delete(webauthnChallengeTable)
    .where(lt(webauthnChallengeTable.expiresAt, now));
}

export async function insertSession(values: SessionRow): Promise<void> {
  await getDatabase().insert(sessionTable).values(values);
}

export async function findSession(id: string): Promise<SessionRow | null> {
  const rows = await getDatabase()
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await getDatabase().delete(sessionTable).where(eq(sessionTable.id, id));
}

export async function deleteExpiredSessions(now: Date): Promise<void> {
  await getDatabase().delete(sessionTable).where(lt(sessionTable.expiresAt, now));
}

export async function findAttempt(ipHash: string): Promise<AttemptRow | null> {
  const rows = await getDatabase()
    .select()
    .from(authAttemptTable)
    .where(eq(authAttemptTable.ipHash, ipHash))
    .limit(1);
  return rows[0] ?? null;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function saveAttempt(values: AttemptRow): Promise<void> {
  await getDatabase()
    .insert(authAttemptTable)
    .values(values)
    .onConflictDoUpdate({
      target: authAttemptTable.ipHash,
      set: { attempts: values.attempts, windowStartedAt: values.windowStartedAt },
    });
}
