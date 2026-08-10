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

// @FollowsBlueprint service-passthrough
export async function getTransitionComments(): Promise<TransitionCommentRow[]> {
  return await listTransitionComments();
}

export async function getTransitionComment(
  songAId: string,
  songBId: string,
): Promise<TransitionCommentRow | null> {
  return await findTransitionComment(songAId, songBId);
}

export async function saveTransitionComment(
  songAId: string,
  songBId: string,
  comment: string,
  now: Date,
): Promise<void> {
  await upsertTransitionComment(songAId, songBId, comment, now);
}

export async function removeTransitionComment(
  songAId: string,
  songBId: string,
): Promise<DeletionOutcome> {
  return await deleteTransitionComment(songAId, songBId);
}
