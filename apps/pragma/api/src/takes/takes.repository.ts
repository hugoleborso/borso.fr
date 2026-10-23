import { TAKE_CONTENT_TYPES } from '@domain/take-upload.core';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { memberTable } from '../members/members.schema';
import { takeCommentTable, takeTable } from './takes.schema';
import type {
  TakeCommentChanges,
  TakeCommentInsert,
  TakeCommentView,
  TakeInsert,
  TakeRow,
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
} as const;

const COMMENT_PROJECTION = {
  id: takeCommentTable.id,
  takeId: takeCommentTable.takeId,
  memberId: takeCommentTable.memberId,
  authorName: memberTable.firstName,
  body: takeCommentTable.body,
  atSeconds: takeCommentTable.atSeconds,
  createdAt: takeCommentTable.createdAt,
} as const;

type TakeRawRow = Omit<TakeRow, 'contentType'> & { readonly contentType: string };

// @FollowsBlueprint repository-row-mapper
function rowToTake(row: TakeRawRow): TakeRow {
  return { ...row, contentType: takeContentTypeSchema.parse(row.contentType) };
}

function selectTakes(executor: DatabaseExecutor) {
  return executor
    .select(TAKE_PROJECTION)
    .from(takeTable)
    .leftJoin(memberTable, eq(memberTable.id, takeTable.memberId));
}

function selectComments(executor: DatabaseExecutor) {
  return executor
    .select(COMMENT_PROJECTION)
    .from(takeCommentTable)
    .leftJoin(memberTable, eq(memberTable.id, takeCommentTable.memberId));
}

async function countCommentsOfTakes(takeIds: readonly string[]): Promise<Map<string, number>> {
  if (takeIds.length === 0) return new Map();
  const counted = await getDatabase()
    .select({ takeId: takeCommentTable.takeId, commentCount: count() })
    .from(takeCommentTable)
    .where(inArray(takeCommentTable.takeId, [...takeIds]))
    .groupBy(takeCommentTable.takeId);
  return new Map(counted.map((row) => [row.takeId, row.commentCount]));
}

async function withCommentCounts(takes: readonly TakeRow[]): Promise<TakeView[]> {
  const commentCounts = await countCommentsOfTakes(takes.map((take) => take.id));
  return takes.map((take) => ({ ...take, commentCount: commentCounts.get(take.id) ?? 0 }));
}

// @FollowsBlueprint repository-idempotent-upsert
export async function hasInsertedTake(take: TakeInsert): Promise<boolean> {
  const inserted = await getDatabase()
    .insert(takeTable)
    .values(take)
    .onConflictDoNothing()
    .returning({ id: takeTable.id });
  return inserted.length > 0;
}

export async function findTake(id: string): Promise<TakeView | null> {
  const [row] = await selectTakes(getDatabase()).where(eq(takeTable.id, id)).limit(1);
  if (row === undefined) return null;
  const [take] = await withCommentCounts([rowToTake(row)]);
  return take ?? null;
}

export async function listTakesOfSongNewestFirst(songId: string): Promise<TakeView[]> {
  const rows = await selectTakes(getDatabase())
    .where(eq(takeTable.songId, songId))
    .orderBy(desc(takeTable.recordedAt), desc(takeTable.id));
  return await withCommentCounts(rows.map(rowToTake));
}

export async function deleteTakeWithComments(id: string): Promise<string | null> {
  return await getDatabase().transaction(async (transaction) => {
    await transaction.delete(takeCommentTable).where(eq(takeCommentTable.takeId, id));
    const [deleted] = await transaction
      .delete(takeTable)
      .where(eq(takeTable.id, id))
      .returning({ objectKey: takeTable.objectKey });
    return deleted?.objectKey ?? null;
  });
}

export async function listCommentsOfTake(takeId: string): Promise<TakeCommentView[]> {
  return await selectComments(getDatabase()).where(eq(takeCommentTable.takeId, takeId));
}

async function findComment(takeId: string, commentId: string): Promise<TakeCommentView | null> {
  const [comment] = await selectComments(getDatabase())
    .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
    .limit(1);
  return comment ?? null;
}

export async function insertComment(comment: TakeCommentInsert): Promise<TakeCommentView | null> {
  const [inserted] = await getDatabase()
    .insert(takeCommentTable)
    .values(comment)
    .returning({ id: takeCommentTable.id });
  return inserted === undefined ? null : await findComment(comment.takeId, inserted.id);
}

export async function updateComment(
  takeId: string,
  commentId: string,
  changes: TakeCommentChanges,
): Promise<TakeCommentView | null> {
  const updated = await getDatabase()
    .update(takeCommentTable)
    .set(changes)
    .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
    .returning({ id: takeCommentTable.id });
  return updated.length === 0 ? null : await findComment(takeId, commentId);
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
  const takeIdsOfSong = executor
    .select({ id: takeTable.id })
    .from(takeTable)
    .where(eq(takeTable.songId, songId));
  await executor.delete(takeCommentTable).where(inArray(takeCommentTable.takeId, takeIdsOfSong));
  const deleted = await executor
    .delete(takeTable)
    .where(eq(takeTable.songId, songId))
    .returning({ objectKey: takeTable.objectKey });
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
