/**
 * Repository for the transition-comments bounded context.
 */

import { and, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
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

export async function listTransitionComments(
  database: Database,
): Promise<TransitionCommentRow[]> {
  return await database.select(PROJECTION).from(transitionCommentTable);
}

export async function findTransitionComment(
  database: Database,
  a: string,
  b: string,
): Promise<TransitionCommentRow | null> {
  const rows = await database
    .select(PROJECTION)
    .from(transitionCommentTable)
    .where(and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTransitionComment(
  database: Database,
  a: string,
  b: string,
  comment: string,
  now: Date,
): Promise<void> {
  await database
    .insert(transitionCommentTable)
    .values({ songAId: a, songBId: b, comment })
    .onConflictDoUpdate({
      target: [transitionCommentTable.songAId, transitionCommentTable.songBId],
      set: { comment, updatedAt: now },
    });
}

export async function deleteTransitionComment(
  database: Database,
  a: string,
  b: string,
): Promise<boolean> {
  const deleted = await database
    .delete(transitionCommentTable)
    .where(and(eq(transitionCommentTable.songAId, a), eq(transitionCommentTable.songBId, b)))
    .returning({ id: transitionCommentTable.id });
  return deleted.length > 0;
}
