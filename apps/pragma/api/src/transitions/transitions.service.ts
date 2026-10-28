import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import { findSongById, getSongs, resolveSongId } from '../songs/songs.service';
import { projectTransitionComments, type TransitionToolView } from './transition-tool.core';
import {
  deleteTransitionComment,
  listTransitionComments,
  type TransitionCommentRow,
  upsertTransitionComment,
} from './transitions.repository';
export { findTransitionComment } from './transitions.repository';
export { defineTool } from '../mcp/mcp.service';
export { resolveSongId } from '../songs/songs.service';

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

export async function resolveOptionalSongId(
  reference: string | undefined,
): Promise<string | undefined> {
  if (reference === undefined) return undefined;
  return await resolveSongId(reference);
}

export async function listTransitionCommentsForTool(
  fromReference: string | undefined,
  toReference: string | undefined,
): Promise<TransitionToolView[]> {
  const [fromId, toId] = await Promise.all([
    resolveOptionalSongId(fromReference),
    resolveOptionalSongId(toReference),
  ]);
  const [comments, songs] = await Promise.all([getTransitionComments(), getSongs()]);
  return projectTransitionComments(comments, songs, { fromId, toId });
}

export async function writeTransitionComment(
  songAId: string,
  songBId: string,
  comment: string | null,
  actor: WriteActor,
): Promise<DeletionOutcome | 'saved'> {
  if (comment === null) return await removeTransitionComment(songAId, songBId);
  await saveTransitionComment(songAId, songBId, comment, actor);
  return 'saved';
}
