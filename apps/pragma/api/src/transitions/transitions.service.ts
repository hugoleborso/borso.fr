/**
 * Service layer for transition comments.
 */

import type { Database } from '../database/client';
import {
  type TransitionCommentRow,
  deleteTransitionComment,
  findTransitionComment,
  listTransitionComments,
  upsertTransitionComment,
} from './transitions.repository';

export async function getTransitionComments(
  database: Database,
): Promise<TransitionCommentRow[]> {
  return await listTransitionComments(database);
}

export async function getTransitionComment(
  database: Database,
  a: string,
  b: string,
): Promise<TransitionCommentRow | null> {
  return await findTransitionComment(database, a, b);
}

export async function saveTransitionComment(
  database: Database,
  a: string,
  b: string,
  comment: string,
): Promise<void> {
  await upsertTransitionComment(database, a, b, comment, new Date());
}

export async function removeTransitionComment(
  database: Database,
  a: string,
  b: string,
): Promise<boolean> {
  return await deleteTransitionComment(database, a, b);
}
