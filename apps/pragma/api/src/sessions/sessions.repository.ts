/**
 * Repository for the sessions bounded context. Deleting a session
 * detaches the setlists it carried; the setlists themselves survive,
 * because one of them may be carried by another session too and every
 * one of them is reachable from the setlists index on its own.
 *
 * `friends_count_per_member` is stored as TEXT (Aurora DSQL doesn't
 * support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
 * `rowToSession` is the single parse-and-Zod-validate boundary; writes
 * JSON.stringify on the way in.
 */

import { desc, eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { sessionSetlistTable } from '../setlists/setlists.schema';
import { encodeSessionInsert, type SessionInsertShape } from './sessions.core';
import { friendsCountSchema, type SessionPersistedUpdate, sessionTable } from './sessions.schema';

export interface SessionRow {
  id: string;
  kind: string;
  date: Date;
  preparedConcertId: string | null;
  venue: string | null;
  capacity: number | null;
  gear: string | null;
  friendsCountPerMember: unknown;
}

interface SessionRawRow {
  id: string;
  kind: string;
  date: Date;
  preparedConcertId: string | null;
  venue: string | null;
  capacity: number | null;
  gear: string | null;
  friendsCountPerMember: string | null;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  id: sessionTable.id,
  kind: sessionTable.kind,
  date: sessionTable.date,
  preparedConcertId: sessionTable.preparedConcertId,
  venue: sessionTable.venue,
  capacity: sessionTable.capacity,
  gear: sessionTable.gear,
  friendsCountPerMember: sessionTable.friendsCountPerMember,
} as const;

// @FollowsBlueprint repository-json-column
function rowToSession(row: SessionRawRow): SessionRow {
  let friendsCountPerMember: unknown = null;
  if (row.friendsCountPerMember !== null) {
    const friendsCountRaw: unknown = JSON.parse(row.friendsCountPerMember);
    friendsCountPerMember = friendsCountSchema.parse(friendsCountRaw);
  }
  return {
    id: row.id,
    kind: row.kind,
    date: row.date,
    preparedConcertId: row.preparedConcertId,
    venue: row.venue,
    capacity: row.capacity,
    gear: row.gear,
    friendsCountPerMember,
  };
}

type SessionUpdateEncoded = Partial<typeof sessionTable.$inferInsert>;

function encodeUpdate(updates: SessionPersistedUpdate): SessionUpdateEncoded {
  const { friendsCountPerMember, ...columns } = updates;
  if (friendsCountPerMember === undefined) return columns;
  return { ...columns, friendsCountPerMember: JSON.stringify(friendsCountPerMember) };
}

export async function listSessions(): Promise<SessionRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(sessionTable)
    .orderBy(desc(sessionTable.date));
  return rows.map((row) => rowToSession(row));
}

export async function findSessionById(id: string): Promise<SessionRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(sessionTable)
    .where(eq(sessionTable.id, id))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : rowToSession(row);
}

export async function insertSession(values: SessionInsertShape): Promise<SessionRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(sessionTable)
    .values(encodeSessionInsert(values))
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToSession(row);
}

export async function updateSession(
  id: string,
  updates: SessionPersistedUpdate,
): Promise<SessionRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(sessionTable)
    .set(encodeUpdate(updates))
    .where(eq(sessionTable.id, id))
    .returning(PROJECTION);
  return row === undefined ? null : rowToSession(row);
}

export async function deleteSessionWithCascade(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  await database.delete(sessionSetlistTable).where(eq(sessionSetlistTable.sessionId, id));
  const deleted = await database
    .delete(sessionTable)
    .where(eq(sessionTable.id, id))
    .returning({ id: sessionTable.id });
  return selectDeletionOutcome(deleted.length);
}
