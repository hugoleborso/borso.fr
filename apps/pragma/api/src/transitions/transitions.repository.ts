/**
 * Repository for the transition-comments bounded context.
 */

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
  a: string,
  b: string,
): Promise<TransitionCommentRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(PROJECTION)
    .from(transitionCommentTable)
    .where(and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTransitionComment(
  a: string,
  b: string,
  comment: string,
  now: Date,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(transitionCommentTable)
    .values({ songAId: a, songBId: b, comment })
    .onConflictDoUpdate({
      target: [transitionCommentTable.songAId, transitionCommentTable.songBId],
      set: { comment, updatedAt: now },
    });
}

export async function deleteTransitionComment(a: string, b: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(transitionCommentTable)
    .where(and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)))
    .returning({ id: transitionCommentTable.id });
  return selectDeletionOutcome(deleted.length);
}
