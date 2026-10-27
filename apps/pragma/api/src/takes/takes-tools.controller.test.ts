import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
  passNotificationGroupWindow,
  prepareAssistantBand,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { deviceEndpoint, readSentNotifications } from '../../../test/push-utils';
import { takeCommentTable, takeTable } from './takes.schema';

const PRESIGNER_ENV = {
  AWS_ACCESS_KEY_ID: 'AKIA-PRAGMA-TEST',
  AWS_SECRET_ACCESS_KEY: 'pragma-secret-long-enough-for-sigv4-signing',
  AWS_REGION: 'eu-west-3',
  UPLOADS_BUCKET: 'pragma-test-uploads',
} as const;

const FILE_BYTES = 4_194_304;
const DURATION_SECONDS = 232;
const MOMENT_SECONDS = 42;
const LATER_MOMENT_SECONDS = 90;
const PAST_END_SECONDS = DURATION_SECONDS + 1;
const RECORDED_AT = '2026-10-18T20:00:00.000Z';

const songBodySchema = z.object({ song: z.object({ id: z.string().uuid() }) });
const uploadBodySchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});
const takeSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  objectKey: z.string(),
  commentCount: z.number(),
});
const takeBodySchema = z.object({ take: takeSchema });
const takesBodySchema = z.object({ takes: z.array(takeSchema) });
const commentSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  body: z.string(),
  atSeconds: z.number().nullable(),
});
const commentBodySchema = z.object({ comment: commentSchema });
const commentsBodySchema = z.object({ comments: z.array(commentSchema) });

async function createSong(band: AssistantBand): Promise<string> {
  const reply = await callTool(band.assistant, 'create_song', { title: 'Creep', status: 'idea' });
  return songBodySchema.parse(reply.body).song.id;
}

function buildTakeArguments(takeId: string, songId: string, objectKey: string) {
  return {
    id: takeId,
    objectKey,
    songId,
    recordedAt: RECORDED_AT,
    durationSeconds: DURATION_SECONDS,
    contentType: 'audio/mpeg',
    source: 'upload',
    queued: false,
  };
}

async function uploadTake(band: AssistantBand, songId: string): Promise<string> {
  const takeId = randomUUID();
  const upload = await callTool(band.assistant, 'request_take_upload', {
    takeId,
    songId,
    contentType: 'audio/mpeg',
    contentLength: FILE_BYTES,
  });
  const { objectKey } = uploadBodySchema.parse(upload.body);
  const created = await callTool(
    band.assistant,
    'create_take',
    buildTakeArguments(takeId, songId, objectKey),
  );
  return takeBodySchema.parse(created.body).take.id;
}

async function commentOnTake(band: AssistantBand, takeId: string): Promise<string> {
  const reply = await callTool(band.assistant, 'comment_on_take', {
    id: takeId,
    body: 'The bridge drags',
    atSeconds: MOMENT_SECONDS,
  });
  return commentBodySchema.parse(reply.body).comment.id;
}

function refused(error: string) {
  return { isError: true, body: { error } };
}

function stubObjectDeletion() {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the service calls the promise form, which is what this stub answers
  return vi.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({}));
}

async function readTakeRows(takeId: string) {
  const database = testDatabase();
  const [takes, comments] = await Promise.all([
    database.select().from(takeTable).where(eq(takeTable.id, takeId)),
    database.select().from(takeCommentTable).where(eq(takeCommentTable.takeId, takeId)),
  ]);
  return { takes, comments };
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('takes tools (back-e2e)', () => {
  useOAuthOrigins();
  const previous: Record<string, string | undefined> = {};

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const [name, value] of Object.entries(PRESIGNER_ENV)) {
      previous[name] = process.env[name];
      process.env[name] = value;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const name of Object.keys(PRESIGNER_ENV)) {
      const saved = previous[name];
      if (saved === undefined) delete process.env[name];
      else process.env[name] = saved;
    }
  });

  it('signs an upload, then records the take as the granting member', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band);
    const takeId = randomUUID();

    const upload = await callTool(band.assistant, 'request_take_upload', {
      takeId,
      songId,
      contentType: 'audio/mpeg',
      contentLength: FILE_BYTES,
    });
    const signed = uploadBodySchema.parse(upload.body);
    const created = await callTool(
      band.assistant,
      'create_take',
      buildTakeArguments(takeId, songId, signed.objectKey),
    );
    const listed = takesBodySchema.parse(
      (await callTool(band.assistant, 'list_takes', { songId })).body,
    );
    const { takes } = await readTakeRows(takeId);

    expect(upload.isError).toBe(false);
    expect(signed.objectKey).toBe(`take/${songId}/${takeId}.mp3`);
    expect(new URL(signed.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toContain(
      'content-length',
    );
    expect(created.isError).toBe(false);
    expect(takeBodySchema.parse(created.body).take.memberId).toBe(band.hugo.memberId);
    expect(listed.takes.map((take) => take.id)).toEqual([takeId]);
    expect(takes.map((take) => [take.memberId, take.objectKey])).toEqual([
      [band.hugo.memberId, signed.objectKey],
    ]);
  });

  it('comments on a take as the granting member, edits the comment, then deletes it', async () => {
    const band = await prepareAssistantBand();
    const takeId = await uploadTake(band, await createSong(band));

    const commentId = await commentOnTake(band, takeId);
    const updated = await callTool(band.assistant, 'update_take_comment', {
      id: takeId,
      commentId,
      body: 'The bridge drags, slow the fill',
      atSeconds: LATER_MOMENT_SECONDS,
    });
    const listed = commentsBodySchema.parse(
      (await callTool(band.assistant, 'list_take_comments', { id: takeId })).body,
    );
    const { comments } = await readTakeRows(takeId);

    expect(updated.isError).toBe(false);
    expect(listed.comments).toEqual([
      expect.objectContaining({
        id: commentId,
        memberId: band.hugo.memberId,
        body: 'The bridge drags, slow the fill',
        atSeconds: LATER_MOMENT_SECONDS,
      }),
    ]);
    expect(comments.map((comment) => comment.memberId)).toEqual([band.hugo.memberId]);

    const deleted = await callTool(band.assistant, 'delete_take_comment', {
      id: takeId,
      commentId,
    });

    expect(deleted).toEqual({ isError: false, body: { id: commentId, deleted: true } });
    expect((await readTakeRows(takeId)).comments).toEqual([]);
  });

  it('deletes a take with its comments and its audio file', async () => {
    const band = await prepareAssistantBand();
    const takeId = await uploadTake(band, await createSong(band));
    await commentOnTake(band, takeId);
    const send = stubObjectDeletion();

    const deleted = await callTool(band.assistant, 'delete_take', { id: takeId });

    expect(deleted).toEqual({ isError: false, body: { id: takeId, deleted: true } });
    expect(await readTakeRows(takeId)).toEqual({ takes: [], comments: [] });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const songId = await createSong(band);
    const takeId = await uploadTake(band, songId);
    const commentId = await commentOnTake(band, takeId);
    stubObjectDeletion();

    const replies = {
      unknownSongUpload: await callTool(band.assistant, 'request_take_upload', {
        takeId: unknownId,
        songId: unknownId,
        contentType: 'audio/mpeg',
        contentLength: FILE_BYTES,
      }),
      mismatchedKey: await callTool(
        band.assistant,
        'create_take',
        buildTakeArguments(unknownId, songId, `take/${songId}/${randomUUID()}.mp3`),
      ),
      unknownSongTake: await callTool(
        band.assistant,
        'create_take',
        buildTakeArguments(unknownId, unknownId, `take/${unknownId}/${unknownId}.mp3`),
      ),
      unknownSessionTake: await callTool(band.assistant, 'create_take', {
        ...buildTakeArguments(unknownId, songId, `take/${songId}/${unknownId}.mp3`),
        sessionId: unknownId,
      }),
      missingComments: await callTool(band.assistant, 'list_take_comments', { id: unknownId }),
      missingTakeComment: await callTool(band.assistant, 'comment_on_take', {
        id: unknownId,
        body: 'Nice',
      }),
      pastEndComment: await callTool(band.assistant, 'comment_on_take', {
        id: takeId,
        body: 'Nice',
        atSeconds: PAST_END_SECONDS,
      }),
      emptyUpdate: await callTool(band.assistant, 'update_take_comment', {
        id: takeId,
        commentId,
      }),
      pastEndUpdate: await callTool(band.assistant, 'update_take_comment', {
        id: takeId,
        commentId,
        atSeconds: PAST_END_SECONDS,
      }),
      missingTakeUpdate: await callTool(band.assistant, 'update_take_comment', {
        id: unknownId,
        commentId,
        body: 'Nice',
      }),
      missingCommentUpdate: await callTool(band.assistant, 'update_take_comment', {
        id: takeId,
        commentId: unknownId,
        body: 'Nice',
      }),
      missingCommentDelete: await callTool(band.assistant, 'delete_take_comment', {
        id: takeId,
        commentId: unknownId,
      }),
      missingTakeDelete: await callTool(band.assistant, 'delete_take', { id: unknownId }),
    };

    expect(replies).toEqual({
      unknownSongUpload: refused('song-not-found'),
      mismatchedKey: refused('object-key-mismatch'),
      unknownSongTake: refused('song-not-found'),
      unknownSessionTake: refused('session-not-found'),
      missingComments: refused('take-not-found'),
      missingTakeComment: refused('take-not-found'),
      pastEndComment: refused('moment-past-end'),
      emptyUpdate: refused('empty-update'),
      pastEndUpdate: refused('moment-past-end'),
      missingTakeUpdate: refused('take-not-found'),
      missingCommentUpdate: refused('comment-not-found'),
      missingCommentDelete: refused('not-found'),
      missingTakeDelete: refused('not-found'),
    });
  });

  it('pushes a new take and a new comment to the other members only', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band);
    band.send.mockClear();

    const takeId = await uploadTake(band, songId);
    passNotificationGroupWindow(band.harness);
    await commentOnTake(band, takeId);
    const sent = readSentNotifications(band.send);

    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
      deviceEndpoint('lea-phone'),
    ]);
  });
});
