import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import { findSongById } from '../songs/songs.service';
import {
  deleteTransitionComment,
  listTransitionComments,
  type TransitionCommentRow,
  upsertTransitionComment,
} from './transitions.repository';
export { findTransitionComment } from './transitions.repository';

// @FollowsBlueprint service-passthrough
export async function getTransitionComments(): Promise<TransitionCommentRow[]> {
  return await listTransitionComments();
}

async function notifyTransitionChanged(
  songAId: string,
  songBId: string,
  actor: WriteActor,
): Promise<void> {
  const [songA, songB] = await Promise.all([findSongById(songAId), findSongById(songBId)]);
  if (songA === null || songB === null) return;
  await notifyBand(
    {
      kind: 'transition-changed',
      actorMemberId: actor.memberId,
      songAId,
      songATitle: songA.title,
      songBId,
      songBTitle: songB.title,
    },
    actor.now,
  );
}

// @FollowsBlueprint service-orchestration
export async function saveTransitionComment(
  songAId: string,
  songBId: string,
  comment: string,
  actor: WriteActor,
): Promise<void> {
  await upsertTransitionComment(songAId, songBId, comment, actor.now);
  await notifyTransitionChanged(songAId, songBId, actor);
}

export async function removeTransitionComment(
  songAId: string,
  songBId: string,
): Promise<DeletionOutcome> {
  return await deleteTransitionComment(songAId, songBId);
}
