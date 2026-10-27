import { and, desc, eq, lt, notExists, or } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { memberTable } from '../members/members.schema';
import {
  assistantAuthorizationCodeTable,
  assistantClientTable,
  assistantGrantTable,
} from './oauth.schema';
import type {
  AssistantGrantSummary,
  KnownAssistantClient,
  StoredAssistantGrant,
  StoredAuthorizationCode,
} from './oauth.types';

const redirectUrisColumnSchema = z.array(z.string());

// @FollowsBlueprint repository-json-column
function rowToClient(row: typeof assistantClientTable.$inferSelect): KnownAssistantClient {
  const redirectUrisRaw: unknown = JSON.parse(row.redirectUris);
  return {
    id: row.id,
    name: row.name,
    redirectUris: redirectUrisColumnSchema.parse(redirectUrisRaw),
  };
}

export async function insertAssistantClient(
  client: KnownAssistantClient,
  createdAt: Date,
): Promise<void> {
  await getDatabase()
    .insert(assistantClientTable)
    .values({
      id: client.id,
      name: client.name,
      redirectUris: JSON.stringify(client.redirectUris),
      createdAt,
    });
}

// @FollowsBlueprint repository-query
export async function findAssistantClient(clientId: string): Promise<KnownAssistantClient | null> {
  const rows = await getDatabase()
    .select()
    .from(assistantClientTable)
    .where(eq(assistantClientTable.id, clientId))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : rowToClient(row);
}

export async function deleteClientsWithoutGrantCreatedBefore(floor: Date): Promise<void> {
  const database = getDatabase();
  await database
    .delete(assistantClientTable)
    .where(
      and(
        lt(assistantClientTable.createdAt, floor),
        notExists(
          database
            .select({ id: assistantGrantTable.id })
            .from(assistantGrantTable)
            .where(eq(assistantGrantTable.clientId, assistantClientTable.id)),
        ),
      ),
    );
}

export async function insertAuthorizationCode(
  codeHash: string,
  code: StoredAuthorizationCode,
): Promise<void> {
  await getDatabase()
    .insert(assistantAuthorizationCodeTable)
    .values({ codeHash, ...code });
}

export async function deleteAuthorizationCodesExpiredBefore(now: Date): Promise<void> {
  await getDatabase()
    .delete(assistantAuthorizationCodeTable)
    .where(lt(assistantAuthorizationCodeTable.expiresAt, now));
}

// @FollowsBlueprint repository-conditional-claim
export async function claimAuthorizationCode(
  codeHash: string,
): Promise<StoredAuthorizationCode | null> {
  const claimed = await getDatabase()
    .delete(assistantAuthorizationCodeTable)
    .where(eq(assistantAuthorizationCodeTable.codeHash, codeHash))
    .returning({
      clientId: assistantAuthorizationCodeTable.clientId,
      memberId: assistantAuthorizationCodeTable.memberId,
      redirectUri: assistantAuthorizationCodeTable.redirectUri,
      codeChallenge: assistantAuthorizationCodeTable.codeChallenge,
      expiresAt: assistantAuthorizationCodeTable.expiresAt,
    });
  return claimed[0] ?? null;
}

export interface NewAssistantGrant {
  readonly id: string;
  readonly clientId: string;
  readonly memberId: string;
  readonly refreshTokenHash: string;
  readonly refreshExpiresAt: Date;
  readonly accessTokenHash: string;
  readonly accessExpiresAt: Date;
  readonly sessionEpoch: number;
  readonly createdAt: Date;
}

export async function insertAssistantGrant(grant: NewAssistantGrant): Promise<void> {
  await getDatabase().insert(assistantGrantTable).values(grant);
}

const STORED_GRANT_PROJECTION = {
  id: assistantGrantTable.id,
  clientId: assistantGrantTable.clientId,
  memberId: assistantGrantTable.memberId,
  refreshTokenHash: assistantGrantTable.refreshTokenHash,
  previousRefreshTokenHash: assistantGrantTable.previousRefreshTokenHash,
  refreshExpiresAt: assistantGrantTable.refreshExpiresAt,
  sessionEpoch: assistantGrantTable.sessionEpoch,
};

export async function findGrantByRefreshTokenHash(
  refreshTokenHash: string,
): Promise<StoredAssistantGrant | null> {
  const rows = await getDatabase()
    .select(STORED_GRANT_PROJECTION)
    .from(assistantGrantTable)
    .where(
      or(
        eq(assistantGrantTable.refreshTokenHash, refreshTokenHash),
        eq(assistantGrantTable.previousRefreshTokenHash, refreshTokenHash),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface GrantRotation {
  readonly grantId: string;
  readonly presentedRefreshTokenHash: string;
  readonly refreshTokenHash: string;
  readonly refreshExpiresAt: Date;
  readonly accessTokenHash: string;
  readonly accessExpiresAt: Date;
}

export async function hasRotatedGrant(rotation: GrantRotation): Promise<boolean> {
  const rotated = await getDatabase()
    .update(assistantGrantTable)
    .set({
      refreshTokenHash: rotation.refreshTokenHash,
      previousRefreshTokenHash: rotation.presentedRefreshTokenHash,
      refreshExpiresAt: rotation.refreshExpiresAt,
      accessTokenHash: rotation.accessTokenHash,
      accessExpiresAt: rotation.accessExpiresAt,
    })
    .where(
      and(
        eq(assistantGrantTable.id, rotation.grantId),
        eq(assistantGrantTable.refreshTokenHash, rotation.presentedRefreshTokenHash),
      ),
    )
    .returning({ id: assistantGrantTable.id });
  return rotated.length > 0;
}

export async function deleteGrant(grantId: string): Promise<void> {
  await getDatabase().delete(assistantGrantTable).where(eq(assistantGrantTable.id, grantId));
}

export async function deleteGrantHoldingToken(tokenHash: string): Promise<number> {
  const deleted = await getDatabase()
    .delete(assistantGrantTable)
    .where(
      or(
        eq(assistantGrantTable.refreshTokenHash, tokenHash),
        eq(assistantGrantTable.accessTokenHash, tokenHash),
      ),
    )
    .returning({ id: assistantGrantTable.id });
  return deleted.length;
}

export async function deleteGrantOfMember(memberId: string, grantId: string): Promise<number> {
  const deleted = await getDatabase()
    .delete(assistantGrantTable)
    .where(and(eq(assistantGrantTable.id, grantId), eq(assistantGrantTable.memberId, memberId)))
    .returning({ id: assistantGrantTable.id });
  return deleted.length;
}

export async function listGrantsOfMember(memberId: string): Promise<AssistantGrantSummary[]> {
  return await getDatabase()
    .select({
      id: assistantGrantTable.id,
      clientName: assistantClientTable.name,
      createdAt: assistantGrantTable.createdAt,
      lastUsedAt: assistantGrantTable.lastUsedAt,
    })
    .from(assistantGrantTable)
    .innerJoin(assistantClientTable, eq(assistantClientTable.id, assistantGrantTable.clientId))
    .where(eq(assistantGrantTable.memberId, memberId))
    .orderBy(desc(assistantGrantTable.createdAt));
}

export async function findMemberFirstName(memberId: string): Promise<string | null> {
  const rows = await getDatabase()
    .select({ firstName: memberTable.firstName })
    .from(memberTable)
    .where(eq(memberTable.id, memberId))
    .limit(1);
  return rows[0]?.firstName ?? null;
}

// @FollowsBlueprint repository-owned-transaction
export async function deleteAssistantStateOfMemberWithin(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await executor.delete(assistantGrantTable).where(eq(assistantGrantTable.memberId, memberId));
  await executor
    .delete(assistantAuthorizationCodeTable)
    .where(eq(assistantAuthorizationCodeTable.memberId, memberId));
}
