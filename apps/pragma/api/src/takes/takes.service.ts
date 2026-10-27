import type { DatabaseExecutor } from '../database/client';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { notifyBand } from '../notifications/notifications.service';
import { didClaimSessionWithin } from '../sessions/sessions.service';
import { didClaimSongWithin, findSongById } from '../songs/songs.service';
import { deleteStoredObjects, mintObjectUpload } from '../uploads/uploads.service';
import { buildTakeObjectKey, isMomentWithinTake, orderCommentsByTime } from './takes.core';
import {
  type ClaimedTake,
  deleteComment,
  deleteTakeWithComments,
  deleteTakesOfSongWithin,
  detachTakesOfSessionWithin,
  findClaimedTakeWithin,
  findTake,
  getWrittenTakeWithin,
  hasInsertedTakeWithin,
  insertCommentWithin,
  listCommentsOfTake,
  listTakesOfSongNewestFirst,
  runInOneTakeTransaction,
  updateComment,
} from './takes.repository';
import type {
  TakeCommentCreateInput,
  TakeCommentUpdateInput,
  TakeCreateInput,
  TakeSignInput,
} from './takes.schema';
import type {
  TakeCommentsOutcome,
  TakeCommentView,
  TakeCommentWriteOutcome,
  TakeCreateOutcome,
  TakeUploadOutcome,
  TakeView,
} from './takes.types';

export { defineTool } from '../mcp/mcp.service';

const TAKE_OBJECT_DELETE_FAILED = 'TakeObjectDeleteFailed';

interface ActorCommand {
  readonly memberId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-clock-injected
export async function mintTakeUpload(input: TakeSignInput, now: Date): Promise<TakeUploadOutcome> {
  if ((await findSongById(input.songId)) === null) return { kind: 'song-not-found' };
  const minted = await mintObjectUpload({
    objectKey: buildTakeObjectKey({
      songId: input.songId,
      takeId: input.takeId,
      contentType: input.contentType,
    }),
    contentType: input.contentType,
    contentLength: input.contentLength,
    now,
  });
  return { kind: 'ok', ...minted };
}

type TakeRecording =
  | { readonly kind: 'recorded'; readonly take: TakeView; readonly isNewTake: boolean }
  | { readonly kind: 'song-not-found' }
  | { readonly kind: 'session-not-found' };

async function didClaimSessionUnlessLooseWithin(
  executor: DatabaseExecutor,
  sessionId: string | null,
): Promise<boolean> {
  return sessionId === null || (await didClaimSessionWithin(executor, sessionId));
}

async function recordTake(input: TakeCreateInput, command: ActorCommand): Promise<TakeRecording> {
  return await runInOneTakeTransaction(async (executor): Promise<TakeRecording> => {
    const isSongClaimed = await didClaimSongWithin(executor, input.songId);
    if (!isSongClaimed) return { kind: 'song-not-found' };
    const isSessionClaimed = await didClaimSessionUnlessLooseWithin(executor, input.sessionId);
    if (!isSessionClaimed) return { kind: 'session-not-found' };
    const isNewTake = await hasInsertedTakeWithin(executor, {
      id: input.id,
      songId: input.songId,
      sessionId: input.sessionId,
      memberId: command.memberId,
      objectKey: input.objectKey,
      contentType: input.contentType,
      durationSeconds: input.durationSeconds,
      recordedAt: new Date(input.recordedAt),
      createdAt: command.now,
    });
    return { kind: 'recorded', take: await getWrittenTakeWithin(executor, input.id), isNewTake };
  });
}

async function notifyBandAboutTake(
  kind: 'take-created' | 'take-comment-created',
  take: Pick<TakeView, 'id' | 'songId'>,
  command: ActorCommand,
): Promise<void> {
  const song = await findSongById(take.songId);
  if (song === null) return;
  await notifyBand(
    {
      kind,
      actorMemberId: command.memberId,
      takeId: take.id,
      songId: song.id,
      songTitle: song.title,
    },
    command.now,
  );
}

// @FollowsBlueprint service-orchestration
export async function createTake(
  input: TakeCreateInput,
  command: ActorCommand,
): Promise<TakeCreateOutcome> {
  const expectedObjectKey = buildTakeObjectKey({
    songId: input.songId,
    takeId: input.id,
    contentType: input.contentType,
  });
  if (input.objectKey !== expectedObjectKey) return { kind: 'object-key-mismatch' };
  const recording = await recordTake(input, command);
  if (recording.kind !== 'recorded') return recording;
  const { take } = recording;
  if (!recording.isNewTake) return { kind: 'ok', take };
  recordProductEvent({ event: 'take_created', source: input.source, queued: input.queued });
  await notifyBandAboutTake('take-created', take, command);
  return { kind: 'ok', take };
}

export async function getTakesOfSong(songId: string): Promise<TakeView[]> {
  return await listTakesOfSongNewestFirst(songId);
}

async function deleteAudioOfDeletedTakes(objectKeys: readonly string[]): Promise<void> {
  if (objectKeys.length === 0) return;
  const deletion = await deleteStoredObjects(objectKeys);
  if (deletion.failedObjectKeys.length === 0) return;
  console.warn(
    JSON.stringify({
      event: TAKE_OBJECT_DELETE_FAILED,
      objectKeys: deletion.failedObjectKeys,
      failure: deletion.failureName,
    }),
  );
}

export async function removeTake(id: string): Promise<DeletionOutcome> {
  const objectKey = await deleteTakeWithComments(id);
  if (objectKey === null) return 'not-found';
  await deleteAudioOfDeletedTakes([objectKey]);
  return 'deleted';
}

export async function getCommentsOfTake(takeId: string): Promise<TakeCommentsOutcome> {
  if ((await findTake(takeId)) === null) return { kind: 'take-not-found' };
  return { kind: 'ok', comments: orderCommentsByTime(await listCommentsOfTake(takeId)) };
}

type CommentRecording =
  | { readonly kind: 'recorded'; readonly take: ClaimedTake; readonly comment: TakeCommentView }
  | { readonly kind: 'take-not-found' }
  | { readonly kind: 'moment-past-end' };

async function recordComment(
  takeId: string,
  input: TakeCommentCreateInput,
  command: ActorCommand,
): Promise<CommentRecording> {
  return await runInOneTakeTransaction(async (executor): Promise<CommentRecording> => {
    const take = await findClaimedTakeWithin(executor, takeId);
    if (take === null) return { kind: 'take-not-found' };
    if (!isMomentWithinTake(input.atSeconds, take.durationSeconds)) {
      return { kind: 'moment-past-end' };
    }
    const comment = await insertCommentWithin(executor, {
      takeId,
      memberId: command.memberId,
      body: input.body,
      atSeconds: input.atSeconds,
      createdAt: command.now,
    });
    return { kind: 'recorded', take, comment };
  });
}

export async function createTakeComment(
  takeId: string,
  input: TakeCommentCreateInput,
  command: ActorCommand,
): Promise<TakeCommentWriteOutcome> {
  const recording = await recordComment(takeId, input, command);
  if (recording.kind !== 'recorded') return recording;
  recordProductEvent({ event: 'take_comment_created', hasMoment: input.atSeconds !== null });
  await notifyBandAboutTake('take-comment-created', recording.take, command);
  return { kind: 'ok', comment: recording.comment };
}

export async function patchTakeComment(
  takeId: string,
  commentId: string,
  input: TakeCommentUpdateInput,
): Promise<TakeCommentWriteOutcome> {
  const take = await findTake(takeId);
  if (take === null) return { kind: 'take-not-found' };
  if (input.atSeconds !== undefined && !isMomentWithinTake(input.atSeconds, take.durationSeconds)) {
    return { kind: 'moment-past-end' };
  }
  const comment = await updateComment(takeId, commentId, input);
  if (comment === null) return { kind: 'comment-not-found' };
  return { kind: 'ok', comment };
}

export async function removeTakeComment(
  takeId: string,
  commentId: string,
): Promise<DeletionOutcome> {
  return await deleteComment(takeId, commentId);
}

export async function deleteTakesOfDeletedSong(
  executor: DatabaseExecutor,
  songId: string,
): Promise<string[]> {
  return await deleteTakesOfSongWithin(executor, songId);
}

export async function deleteAudioOfDeletedSong(objectKeys: readonly string[]): Promise<void> {
  await deleteAudioOfDeletedTakes(objectKeys);
}

export async function detachTakesOfDeletedSession(
  executor: DatabaseExecutor,
  sessionId: string,
): Promise<void> {
  await detachTakesOfSessionWithin(executor, sessionId);
}
