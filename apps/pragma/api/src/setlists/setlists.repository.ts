import { and, asc, eq, isNull, max, ne, or, sql } from 'drizzle-orm';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { retryingConflictAborts } from '../helpers/persistence/conflict-abort.core';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { selectAudienceChoiceSetlistId, selectNextLinkPosition } from './setlists.core';
import {
  AUDIENCE_CHOICE_SETLIST_KIND,
  AUDIENCE_CHOICE_SETLIST_NAME,
  sessionSetlistTable,
  setlistEntryTable,
  type SetlistKind,
  setlistTable,
} from './setlists.schema';

export type SetlistRow = typeof setlistTable.$inferSelect;

// @FollowsBlueprint repository-projection
const SETLIST_PROJECTION = {
  id: setlistTable.id,
  name: setlistTable.name,
  kind: setlistTable.kind,
  status: setlistTable.status,
  targetSongCount: setlistTable.targetSongCount,
} as const;

// @FollowsBlueprint repository-owned-transaction
export async function runInOneSetlistTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await retryingConflictAborts(async () => await getDatabase().transaction(work));
}

export async function listSetlists(): Promise<SetlistRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(SETLIST_PROJECTION)
    .from(setlistTable)
    .orderBy(asc(setlistTable.id));
  return rows;
}

export async function findSetlistById(setlistId: string): Promise<SetlistRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(SETLIST_PROJECTION)
    .from(setlistTable)
    .where(eq(setlistTable.id, setlistId))
    .limit(1);
  const row = rows[0];
  return row ?? null;
}

export async function listSetlistsOfSession(sessionId: string): Promise<SetlistRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(SETLIST_PROJECTION)
    .from(sessionSetlistTable)
    .innerJoin(setlistTable, eq(setlistTable.id, sessionSetlistTable.setlistId))
    .where(eq(sessionSetlistTable.sessionId, sessionId))
    .orderBy(asc(sessionSetlistTable.position));
  return rows;
}

export async function findAudienceChoiceSetlistOfSession(
  sessionId: string,
): Promise<SetlistRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(SETLIST_PROJECTION)
    .from(sessionSetlistTable)
    .innerJoin(setlistTable, eq(setlistTable.id, sessionSetlistTable.setlistId))
    .where(
      and(
        eq(sessionSetlistTable.sessionId, sessionId),
        eq(setlistTable.kind, AUDIENCE_CHOICE_SETLIST_KIND),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ?? null;
}

export async function listManualSetlistSongIdsOfSession(sessionId: string): Promise<string[]> {
  const database = getDatabase();
  const rows = await database
    .select({ songId: setlistEntryTable.songId })
    .from(sessionSetlistTable)
    .innerJoin(setlistTable, eq(setlistTable.id, sessionSetlistTable.setlistId))
    .innerJoin(setlistEntryTable, eq(setlistEntryTable.setlistId, setlistTable.id))
    .where(
      and(
        eq(sessionSetlistTable.sessionId, sessionId),
        or(isNull(setlistTable.kind), ne(setlistTable.kind, AUDIENCE_CHOICE_SETLIST_KIND)),
      ),
    );
  return rows.map((row) => row.songId);
}

export async function insertSetlistWithin(
  executor: DatabaseExecutor,
  name: string,
  kind: SetlistKind,
): Promise<SetlistRow> {
  const [row] = await executor
    .insert(setlistTable)
    .values({ name, kind })
    .returning(SETLIST_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function insertSessionLinkAtEndWithin(
  executor: DatabaseExecutor,
  sessionId: string,
  setlistId: string,
): Promise<void> {
  const [row] = await executor
    .select({ highest: max(sessionSetlistTable.position) })
    .from(sessionSetlistTable)
    .where(eq(sessionSetlistTable.sessionId, sessionId));
  await executor
    .insert(sessionSetlistTable)
    .values({
      sessionId,
      setlistId,
      position: selectNextLinkPosition(row?.highest ?? null),
    })
    .onConflictDoNothing();
}

export async function updateSetlistName(
  setlistId: string,
  name: string,
): Promise<SetlistRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(setlistTable)
    .set({ name })
    .where(eq(setlistTable.id, setlistId))
    .returning(SETLIST_PROJECTION);
  return row ?? null;
}

export async function deleteSetlistWithEntries(setlistId: string): Promise<DeletionOutcome> {
  return await runInOneSetlistTransaction(async (transaction) => {
    const deleted = await transaction
      .delete(setlistTable)
      .where(eq(setlistTable.id, setlistId))
      .returning({ id: setlistTable.id });
    await transaction.delete(setlistEntryTable).where(eq(setlistEntryTable.setlistId, setlistId));
    await transaction
      .delete(sessionSetlistTable)
      .where(eq(sessionSetlistTable.setlistId, setlistId));
    return selectDeletionOutcome(deleted.length);
  });
}

export interface SetlistSessionLink {
  setlistId: string;
  sessionId: string;
}

export async function listAllSessionLinks(): Promise<SetlistSessionLink[]> {
  const database = getDatabase();
  return await database
    .select({
      setlistId: sessionSetlistTable.setlistId,
      sessionId: sessionSetlistTable.sessionId,
    })
    .from(sessionSetlistTable);
}

export async function deleteSessionLink(
  sessionId: string,
  setlistId: string,
): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(sessionSetlistTable)
    .where(
      and(
        eq(sessionSetlistTable.sessionId, sessionId),
        eq(sessionSetlistTable.setlistId, setlistId),
      ),
    )
    .returning({ setlistId: sessionSetlistTable.setlistId });
  return selectDeletionOutcome(deleted.length);
}

export async function didClaimSetlistWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<boolean> {
  const claimed = await executor
    .update(setlistTable)
    .set({ name: sql`${setlistTable.name}` })
    .where(eq(setlistTable.id, setlistId))
    .returning({ id: setlistTable.id });
  return claimed.length > 0;
}

export async function insertAudienceChoiceSetlistWithin(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<SetlistRow> {
  const setlistId = selectAudienceChoiceSetlistId(sessionId);
  await executor
    .insert(setlistTable)
    .values({
      id: setlistId,
      name: AUDIENCE_CHOICE_SETLIST_NAME,
      kind: AUDIENCE_CHOICE_SETLIST_KIND,
    })
    .onConflictDoNothing();
  const [row] = await executor
    .select(SETLIST_PROJECTION)
    .from(setlistTable)
    .where(eq(setlistTable.id, setlistId))
    .limit(1);
  if (row === undefined) throw new Error('audience-choice setlist missing after its insert');
  return row;
}
