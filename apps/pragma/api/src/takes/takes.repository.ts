import { TAKE_CONTENT_TYPES } from '@domain/take-upload.core';
import { and, count, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { retryingConflictAborts } from '../helpers/persistence/conflict-abort.core';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { memberTable } from '../members/members.schema';
import { takeCommentTable, takeTable } from './takes.schema';
import type {
  TakeCommentChanges,
  TakeCommentInsert,
  TakeCommentView,
  TakeInsert,
  TakeView,
} from './takes.types';

const takeContentTypeSchema = z.enum(TAKE_CONTENT_TYPES);

// @FollowsBlueprint repository-projection
const TAKE_PROJECTION = {
  id: takeTable.id,
  songId: takeTable.songId,
  sessionId: takeTable.sessionId,
  memberId: takeTable.memberId,
  authorName: memberTable.firstName,
  objectKey: takeTable.objectKey,
  contentType: takeTable.contentType,
  durationSeconds: takeTable.durationSeconds,
  recordedAt: takeTable.recordedAt,
  createdAt: takeTable.createdAt,
  commentCount: count(takeCommentTable.id),
} as const;

const TAKE_GROUPING = [
  takeTable.id,
  takeTable.songId,
  takeTable.sessionId,
  takeTable.memberId,
  memberTable.firstName,
  takeTable.objectKey,
  takeTable.contentType,
  takeTable.durationSeconds,
  takeTable.recordedAt,
  takeTable.createdAt,
] as const;

const COMMENT_PROJECTION = {
  id: takeCommentTable.id,
  takeId: takeCommentTable.takeId,
  memberId: takeCommentTable.memberId,
  authorName: memberTable.firstName,
  body: takeCommentTable.body,
  atSeconds: takeCommentTable.atSeconds,
  createdAt: takeCommentTable.createdAt,
} as const;

type TakeRawRow = Omit<TakeView, 'contentType'> & { readonly contentType: string };

export type ClaimedTake = Pick<typeof takeTable.$inferSelect, 'id' | 'songId' | 'durationSeconds'>;

// @FollowsBlueprint repository-row-mapper
function rowToTake(row: TakeRawRow): TakeView {
  return { ...row, contentType: takeContentTypeSchema.parse(row.contentType) };
}

function selectTakesWithCommentCounts(executor: DatabaseExecutor, condition: SQL) {
  return executor
    .select(TAKE_PROJECTION)
    .from(takeTable)
    .leftJoin(memberTable, eq(memberTable.id, takeTable.memberId))
    .leftJoin(takeCommentTable, eq(takeCommentTable.takeId, takeTable.id))
    .where(condition)
    .groupBy(...TAKE_GROUPING);
}

function selectComments(executor: DatabaseExecutor) {
  return executor
    .select(COMMENT_PROJECTION)
    .from(takeCommentTable)
    .leftJoin(memberTable, eq(memberTable.id, takeCommentTable.memberId));
}

// @FollowsBlueprint repository-owned-transaction
export async function runInOneTakeTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  return await retryingConflictAborts(async () => await getDatabase().transaction(work));
}

// @FollowsBlueprint repository-idempotent-upsert
export async function hasInsertedTakeWithin(
  executor: DatabaseExecutor,
  take: TakeInsert,
): Promise<boolean> {
  const inserted = await executor
    .insert(takeTable)
    .values(take)
    .onConflictDoNothing()
    .returning({ id: takeTable.id });
  return inserted.length > 0;
}

async function findTakeOn(executor: DatabaseExecutor, id: string): Promise<TakeView | null> {
  const [row] = await selectTakesWithCommentCounts(executor, eq(takeTable.id, id)).limit(1);
  return row === undefined ? null : rowToTake(row);
}

export async function findTake(id: string): Promise<TakeView | null> {
  return await findTakeOn(getDatabase(), id);
}

export async function getWrittenTakeWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<TakeView> {
  const take = await findTakeOn(executor, id);
  if (take === null) throw new Error('the written take is not visible to its own transaction');
  return take;
}

export async function findClaimedTakeWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<ClaimedTake | null> {
  const [claimed] = await executor
    .update(takeTable)
    .set({ objectKey: sql`${takeTable.objectKey}` })
    .where(eq(takeTable.id, id))
    .returning({
      id: takeTable.id,
      songId: takeTable.songId,
      durationSeconds: takeTable.durationSeconds,
    });
  return claimed ?? null;
}

export async function listTakesOfSongNewestFirst(songId: string): Promise<TakeView[]> {
  const rows = await selectTakesWithCommentCounts(
    getDatabase(),
    eq(takeTable.songId, songId),
  ).orderBy(desc(takeTable.recordedAt), desc(takeTable.id));
  return rows.map(rowToTake);
}

export async function deleteTakeWithComments(id: string): Promise<string | null> {
  return await runInOneTakeTransaction(async (transaction) => {
    const [deleted] = await transaction
      .delete(takeTable)
      .where(eq(takeTable.id, id))
      .returning({ objectKey: takeTable.objectKey });
    await transaction.delete(takeCommentTable).where(eq(takeCommentTable.takeId, id));
    return deleted?.objectKey ?? null;
  });
}

export async function listCommentsOfTake(takeId: string): Promise<TakeCommentView[]> {
  return await selectComments(getDatabase()).where(eq(takeCommentTable.takeId, takeId));
}

async function getWrittenCommentWithin(
  executor: DatabaseExecutor,
  takeId: string,
  commentId: string,
): Promise<TakeCommentView> {
  const [comment] = await selectComments(executor)
    .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
    .limit(1);
  if (comment === undefined) {
    throw new Error('the written comment is not visible to its own transaction');
  }
  return comment;
}

export async function insertCommentWithin(
  executor: DatabaseExecutor,
  comment: TakeCommentInsert,
): Promise<TakeCommentView> {
  const [inserted] = await executor
    .insert(takeCommentTable)
    .values(comment)
    .returning({ id: takeCommentTable.id });
  if (inserted === undefined) throw new Error('insert returned no row');
  return await getWrittenCommentWithin(executor, comment.takeId, inserted.id);
}

export async function updateComment(
  takeId: string,
  commentId: string,
  changes: TakeCommentChanges,
): Promise<TakeCommentView | null> {
  return await runInOneTakeTransaction(async (executor) => {
    const updated = await executor
      .update(takeCommentTable)
      .set(changes)
      .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
      .returning({ id: takeCommentTable.id });
    if (updated.length === 0) return null;
    return await getWrittenCommentWithin(executor, takeId, commentId);
  });
}

export async function deleteComment(takeId: string, commentId: string): Promise<DeletionOutcome> {
  const deleted = await getDatabase()
    .delete(takeCommentTable)
    .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
    .returning({ id: takeCommentTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function deleteTakesOfSongWithin(
  executor: DatabaseExecutor,
  songId: string,
): Promise<string[]> {
  const deleted = await executor
    .delete(takeTable)
    .where(eq(takeTable.songId, songId))
    .returning({ id: takeTable.id, objectKey: takeTable.objectKey });
  if (deleted.length === 0) return [];
  const deletedTakeIds = deleted.map((row) => row.id);
  await executor.delete(takeCommentTable).where(inArray(takeCommentTable.takeId, deletedTakeIds));
  return deleted.map((row) => row.objectKey);
}

export async function detachTakesOfSessionWithin(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await executor
    .update(takeTable)
    .set({ sessionId: null })
    .where(eq(takeTable.sessionId, sessionId));
}
