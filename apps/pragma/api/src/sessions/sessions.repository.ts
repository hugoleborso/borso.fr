/**
 * Repository for the sessions bounded context. Owns the cascade on
 * delete (setlist + setlist_entry rows for the session's setlist).
 */

import { desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../database/client';
import { setlistEntryTable, setlistTable } from '../setlists/setlists.schema';
import { sessionTable } from './sessions.schema';

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

export async function listSessions(database: Database): Promise<SessionRow[]> {
  return await database.select(PROJECTION).from(sessionTable).orderBy(desc(sessionTable.date));
}

export async function findSessionById(
  database: Database,
  id: string,
): Promise<SessionRow | null> {
  const rows = await database
    .select(PROJECTION)
    .from(sessionTable)
    .where(eq(sessionTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertSession(
  database: Database,
  values: SessionInsertShape,
): Promise<SessionRow> {
  const [row] = await database.insert(sessionTable).values(values).returning(PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateSession(
  database: Database,
  id: string,
  updates: Record<string, unknown>,
): Promise<SessionRow | null> {
  const [row] = await database
    .update(sessionTable)
    .set(updates)
    .where(eq(sessionTable.id, id))
    .returning(PROJECTION);
  return row ?? null;
}

export async function deleteSessionWithCascade(
  database: Database,
  id: string,
): Promise<boolean> {
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
  return deleted.length > 0;
}
