/**
 * Service layer for transition comments.
 */

import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteTransitionComment,
  findTransitionComment,
  listTransitionComments,
  type TransitionCommentRow,
  upsertTransitionComment,
} from './transitions.repository';

export async function getTransitionComments(): Promise<TransitionCommentRow[]> {
  return await listTransitionComments();
}

export async function getTransitionComment(
  a: string,
  b: string,
): Promise<TransitionCommentRow | null> {
  return await findTransitionComment(a, b);
}

export async function saveTransitionComment(a: string, b: string, comment: string): Promise<void> {
  await upsertTransitionComment(a, b, comment, new Date());
}

export async function removeTransitionComment(a: string, b: string): Promise<DeletionOutcome> {
  return await deleteTransitionComment(a, b);
}
