import type { DatabaseExecutor } from '../database/client';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { recordProductEvent } from '../helpers/observability/product-event.adapter';
import { getSessionById } from '../sessions/sessions.service';
import { getSongById } from '../songs/songs.service';
import { deleteStoredObjects, mintObjectUpload } from '../uploads/uploads.service';
import { buildTakeObjectKey, isMomentWithinTake, orderCommentsByTime } from './takes.core';
import {
  deleteComment,
  deleteTakeWithComments,
  deleteTakesOfSongWithin,
  detachTakesOfSessionWithin,
  findTake,
  insertComment,
  insertTakeIfAbsent,
  listCommentsOfTake,
  listTakesOfSongNewestFirst,
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
  TakeCommentWriteOutcome,
  TakeCreateOutcome,
  TakeUploadOutcome,
  TakeView,
} from './takes.types';

const TAKE_OBJECT_DELETE_FAILED = 'TakeObjectDeleteFailed';

interface ActorCommand {
  readonly memberId: string;
  readonly now: Date;
}

// @FollowsBlueprint service-clock-injected
export async function mintTakeUpload(input: TakeSignInput, now: Date): Promise<TakeUploadOutcome> {
  if ((await getSongById(input.songId)) === null) return { kind: 'song-not-found' };
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

async function isKnownSession(sessionId: string | null): Promise<boolean> {
  return sessionId === null || (await getSessionById(sessionId)) !== null;
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
  if ((await getSongById(input.songId)) === null) return { kind: 'song-not-found' };
  if (!(await isKnownSession(input.sessionId))) return { kind: 'session-not-found' };
  await insertTakeIfAbsent({
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
  const take = await findTake(input.id);
  if (take === null) return { kind: 'song-not-found' };
  recordProductEvent({ event: 'take_created', source: input.source, queued: input.queued });
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

export async function createTakeComment(
  takeId: string,
  input: TakeCommentCreateInput,
  command: ActorCommand,
): Promise<TakeCommentWriteOutcome> {
  const take = await findTake(takeId);
  if (take === null) return { kind: 'take-not-found' };
  if (!isMomentWithinTake(input.atSeconds, take.durationSeconds)) {
    return { kind: 'moment-past-end' };
  }
  const comment = await insertComment({
    takeId,
    memberId: command.memberId,
    body: input.body,
    atSeconds: input.atSeconds,
    createdAt: command.now,
  });
  if (comment === null) return { kind: 'take-not-found' };
  recordProductEvent({ event: 'take_comment_created', hasMoment: input.atSeconds !== null });
  return { kind: 'ok', comment };
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
