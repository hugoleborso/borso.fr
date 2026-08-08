/**
 * Repository for the sessions bounded context. Owns the cascade on
 * delete (setlist + setlist_entry rows for the session's setlist).
 *
 * `friends_count_per_member` is stored as TEXT (Aurora DSQL doesn't
 * support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
 * `rowToSession` is the single parse-and-Zod-validate boundary; writes
 * JSON.stringify on the way in.
 */

import { desc, eq, inArray } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { setlistEntryTable, setlistTable } from '../setlists/setlists.schema';
import { friendsCountSchema, sessionTable } from './sessions.schema';

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

export interface ConcertInsertShape {
  kind: 'concert';
  date: Date;
  venue: string;
  capacity: number;
  gear: string;
  friendsCountPerMember: Record<string, number>;
}

export interface PracticeInsertShape {
  kind: 'practice';
  date: Date;
  preparedConcertId: string | null;
}

export type SessionInsertShape = ConcertInsertShape | PracticeInsertShape;

function rowToSession(row: SessionRawRow): SessionRow {
  // friends_count_per_member is stored as JSON-encoded text. The `as
  // unknown` step is the JSON-parse escape hatch the repo allows; the
  // row Zod schema does the runtime validation.
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

type SessionInsertEncoded = typeof sessionTable.$inferInsert;
type SessionUpdateEncoded = Partial<SessionInsertEncoded>;

function encodeInsert(values: SessionInsertShape): SessionInsertEncoded {
  if (values.kind === 'concert') {
    return {
      kind: 'concert',
      date: values.date,
      venue: values.venue,
      capacity: values.capacity,
      gear: values.gear,
      friendsCountPerMember: JSON.stringify(values.friendsCountPerMember ?? {}),
    };
  }
  return {
    kind: 'practice',
    date: values.date,
    preparedConcertId: values.preparedConcertId,
  };
}

function encodeUpdate(updates: Record<string, unknown>): SessionUpdateEncoded {
  const encoded: SessionUpdateEncoded = {};
  if ('date' in updates && updates.date instanceof Date) encoded.date = updates.date;
  if ('venue' in updates) {
    const value = updates.venue;
    encoded.venue = value === null || typeof value === 'string' ? value : null;
  }
  if ('capacity' in updates) {
    const value = updates.capacity;
    encoded.capacity = value === null || typeof value === 'number' ? value : null;
  }
  if ('gear' in updates) {
    const value = updates.gear;
    encoded.gear = value === null || typeof value === 'string' ? value : null;
  }
  if ('preparedConcertId' in updates) {
    const value = updates.preparedConcertId;
    encoded.preparedConcertId = value === null || typeof value === 'string' ? value : null;
  }
  if ('friendsCountPerMember' in updates) {
    const value = updates.friendsCountPerMember;
    encoded.friendsCountPerMember =
      value === null || value === undefined ? null : JSON.stringify(value);
  }
  return encoded;
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
    .values(encodeInsert(values))
    .returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToSession(row);
}

export async function updateSession(
  id: string,
  updates: Record<string, unknown>,
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
  const setlists = await database
    .select({ id: setlistTable.id })
    .from(setlistTable)
    .where(eq(setlistTable.sessionId, id));
  if (setlists.length > 0) {
    const setlistIds = setlists.map((row) => row.id);
    await database
      .delete(setlistEntryTable)
      .where(inArray(setlistEntryTable.setlistId, setlistIds));
    await database.delete(setlistTable).where(eq(setlistTable.sessionId, id));
  }
  const deleted = await database
    .delete(sessionTable)
    .where(eq(sessionTable.id, id))
    .returning({ id: sessionTable.id });
  return selectDeletionOutcome(deleted.length);
}
