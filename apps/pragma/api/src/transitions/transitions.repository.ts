import { and, eq } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { transitionCommentTable } from './transitions.schema';

export interface TransitionCommentRow {
  songAId: string;
  songBId: string;
  comment: string;
  updatedAt: Date;
}

// @FollowsBlueprint repository-projection
const PROJECTION = {
  songAId: transitionCommentTable.songAId,
  songBId: transitionCommentTable.songBId,
  comment: transitionCommentTable.comment,
  updatedAt: transitionCommentTable.updatedAt,
} as const;

export async function listTransitionComments(): Promise<TransitionCommentRow[]> {
  const database = getDatabase();
  return await database.select(PROJECTION).from(transitionCommentTable);
}

export async function findTransitionComment(
  songAId: string,
  songBId: string,
): Promise<TransitionCommentRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(transitionCommentTable)
    .where(
      and(eq(transitionCommentTable.songAId, songAId), eq(transitionCommentTable.songBId, songBId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface TransitionCommentUpsert {
  readonly songAId: string;
  readonly songBId: string;
  readonly comment: string;
  readonly now: Date;
}

// @FollowsBlueprint repository-idempotent-upsert
export async function upsertTransitionComment({
  songAId,
  songBId,
  comment,
  now,
}: TransitionCommentUpsert): Promise<void> {
  const database = getDatabase();
  await database
    .insert(transitionCommentTable)
    .values({ songAId, songBId, comment })
    .onConflictDoUpdate({
      target: [transitionCommentTable.songAId, transitionCommentTable.songBId],
      set: { comment, updatedAt: now },
    });
}

export async function deleteTransitionComment(
  songAId: string,
  songBId: string,
): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(transitionCommentTable)
    .where(
      and(eq(transitionCommentTable.songAId, songAId), eq(transitionCommentTable.songBId, songBId)),
    )
    .returning({ id: transitionCommentTable.id });
  return selectDeletionOutcome(deleted.length);
}
