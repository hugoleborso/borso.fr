import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import {
  abortCommitsWritingTable,
  holdWritesToTable,
  type LockHold,
  runSecondWhileFirstWaitsOnHold,
  runWhileWaitingOnHold,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import { takeCommentTable, takeTable } from './takes.schema';

const PRESIGNER_ENV = {
  AWS_ACCESS_KEY_ID: 'AKIA-PRAGMA-TEST',
  AWS_SECRET_ACCESS_KEY: 'pragma-secret-long-enough-for-sigv4-signing',
  AWS_REGION: 'eu-west-3',
  UPLOADS_BUCKET: 'pragma-test-uploads',
} as const;

const FIFTY_MEBIBYTES = 52_428_800;
const DURATION_SECONDS = 232;

const takeSchema = z.object({
  id: z.string(),
  songId: z.string(),
  sessionId: z.string().nullable(),
  memberId: z.string(),
  authorName: z.string().nullable(),
  objectKey: z.string(),
  contentType: z.string(),
  durationSeconds: z.number(),
  recordedAt: z.string(),
  createdAt: z.string(),
  commentCount: z.number(),
});
const takeEnvelope = z.object({ take: takeSchema });
const takeListEnvelope = z.object({ takes: z.array(takeSchema) });
const signEnvelope = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});
const commentSchema = z.object({
  id: z.string(),
  takeId: z.string(),
  memberId: z.string(),
  authorName: z.string().nullable(),
  body: z.string(),
  atSeconds: z.number().nullable(),
  createdAt: z.string(),
});
const commentEnvelope = z.object({ comment: commentSchema });
const commentListEnvelope = z.object({ comments: z.array(commentSchema) });
const errorEnvelope = z.object({ error: z.string() });
const deleteRequestSchema = z.object({
  Delete: z.object({ Objects: z.array(z.object({ Key: z.string() })) }),
});
const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.string().uuid() }) });

async function createId(
  band: AuthenticatedApp,
  path: string,
  key: string,
  body: unknown,
): Promise<string> {
  const response = await jsonRequest(band.app, path, {
    method: 'POST',
    body,
    cookieHeader: band.cookieHeader,
  });
  const created = (await readJson(response, idEnvelope(key)))[key];
  if (created === undefined) throw new Error(`no ${key} in the response`);
  return created.id;
}

async function createSong(band: AuthenticatedApp): Promise<string> {
  return await createId(band, '/api/songs', 'song', { title: 'Seven Nation Army', status: 'idea' });
}

async function createPractice(band: AuthenticatedApp): Promise<string> {
  return await createId(band, '/api/sessions', 'session', {
    kind: 'practice',
    date: '2026-10-18T19:00:00Z',
  });
}

interface TakeBody {
  readonly id: string;
  readonly songId: string;
  readonly sessionId?: string | null;
  readonly recordedAt?: string;
}

function buildTakeBody(take: TakeBody) {
  return {
    id: take.id,
    objectKey: `take/${take.songId}/${take.id}.webm`,
    songId: take.songId,
    sessionId: take.sessionId ?? null,
    recordedAt: take.recordedAt ?? '2026-10-18T20:00:00.000Z',
    durationSeconds: DURATION_SECONDS,
    contentType: 'audio/webm',
    source: 'live',
    queued: false,
  };
}

async function postTake(band: AuthenticatedApp, body: unknown): Promise<Response> {
  return await jsonRequest(band.app, '/api/takes', {
    method: 'POST',
    body,
    cookieHeader: band.cookieHeader,
  });
}

async function createTake(band: AuthenticatedApp, take: TakeBody): Promise<string> {
  const response = await postTake(band, buildTakeBody(take));
  return (await readJson(response, takeEnvelope)).take.id;
}

async function listTakes(band: AuthenticatedApp, songId: string) {
  const response = await jsonRequest(band.app, `/api/takes?songId=${songId}`, {
    cookieHeader: band.cookieHeader,
  });
  return (await readJson(response, takeListEnvelope)).takes;
}

async function postComment(
  band: AuthenticatedApp,
  takeId: string,
  body: unknown,
): Promise<Response> {
  return await jsonRequest(band.app, `/api/takes/${takeId}/comments`, {
    method: 'POST',
    body,
    cookieHeader: band.cookieHeader,
  });
}

function holdTakeRow(takeId: string): LockHold {
  return async (transaction) =>
    await transaction
      .select({ id: takeTable.id })
      .from(takeTable)
      .where(eq(takeTable.id, takeId))
      .for('update');
}

const holdReadsOfMembers: LockHold = async (transaction) =>
  await transaction.execute(sql.raw('LOCK TABLE "member" IN ACCESS EXCLUSIVE MODE'));

function deleteTakeRow(takeId: string): LockHold {
  return async (transaction) => await transaction.delete(takeTable).where(eq(takeTable.id, takeId));
}

function deleteCommentsOfTake(takeId: string): LockHold {
  return async (transaction) =>
    await transaction.delete(takeCommentTable).where(eq(takeCommentTable.takeId, takeId));
}

function stubStorage(answer: () => Promise<unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- S3Client.send is overloaded and its last signature, the callback form, returns void; the adapter calls the promise form, which is what this stub answers
  return vi.spyOn(S3Client.prototype, 'send').mockImplementation(answer);
}

function stubObjectDeletion() {
  return stubStorage(() => Promise.resolve({}));
}

function readDeletedObjectKeys(send: ReturnType<typeof stubObjectDeletion>): string[] {
  return send.mock.calls.flatMap(([command]) => {
    const input: unknown = Reflect.get(Object(command), 'input');
    const deletion = deleteRequestSchema.safeParse(input);
    return deletion.success ? deletion.data.Delete.Objects.map((entry) => entry.Key) : [];
  });
}

// @FollowsBlueprint test-back-e2e
describe('takes controller (back-e2e)', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
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

  it('rejects a request without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, `/api/takes?songId=${randomUUID()}`)).status).toBe(401);
  });

  describe('signing an upload', () => {
    it('signs a PUT for the take key, bound to the declared length', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = randomUUID();
      const response = await jsonRequest(band.app, '/api/takes/sign', {
        method: 'POST',
        body: { takeId, songId, contentType: 'audio/webm', contentLength: FIFTY_MEBIBYTES },
        cookieHeader: band.cookieHeader,
      });
      expect(response.status).toBe(200);
      const signed = await readJson(response, signEnvelope);
      expect(signed.objectKey).toBe(`take/${songId}/${takeId}.webm`);
      expect(new URL(signed.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toContain(
        'content-length',
      );
    });

    it('refuses a take one byte over 50 MiB', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const response = await jsonRequest(band.app, '/api/takes/sign', {
        method: 'POST',
        body: {
          takeId: randomUUID(),
          songId,
          contentType: 'audio/webm',
          contentLength: FIFTY_MEBIBYTES + 1,
        },
        cookieHeader: band.cookieHeader,
      });
      expect(response.status).toBe(400);
    });

    it('answers 404 for a song that does not exist', async () => {
      const band = await buildAuthenticatedApp();
      const response = await jsonRequest(band.app, '/api/takes/sign', {
        method: 'POST',
        body: {
          takeId: randomUUID(),
          songId: randomUUID(),
          contentType: 'audio/mp4',
          contentLength: 1,
        },
        cookieHeader: band.cookieHeader,
      });
      expect(response.status).toBe(404);
      expect(await readJson(response, errorEnvelope)).toEqual({ error: 'song-not-found' });
    });
  });

  describe('creating and listing takes', () => {
    it('creates a take linked to its song and practice, named after its author', async () => {
      const band = await buildAuthenticatedApp('Hugo');
      const songId = await createSong(band);
      const sessionId = await createPractice(band);
      const takeId = randomUUID();

      const response = await postTake(band, buildTakeBody({ id: takeId, songId, sessionId }));

      expect(response.status).toBe(201);
      expect((await readJson(response, takeEnvelope)).take).toEqual({
        id: takeId,
        songId,
        sessionId,
        memberId: band.memberId,
        authorName: 'Hugo',
        objectKey: `take/${songId}/${takeId}.webm`,
        contentType: 'audio/webm',
        durationSeconds: DURATION_SECONDS,
        recordedAt: '2026-10-18T20:00:00.000Z',
        createdAt: expect.any(String),
        commentCount: 0,
      });
    });

    it('lists takes by recording time, newest first, whatever order they were uploaded in', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const recentTake = await createTake(band, {
        id: randomUUID(),
        songId,
        recordedAt: '2026-10-18T20:00:00.000Z',
      });
      const lateUploadOfAnOlderTake = await createTake(band, {
        id: randomUUID(),
        songId,
        recordedAt: '2026-10-11T20:00:00.000Z',
      });
      await createTake(band, { id: randomUUID(), songId: await createSong(band) });

      const takes = await listTakes(band, songId);

      expect(takes.map((take) => take.id)).toEqual([recentTake, lateUploadOfAnOlderTake]);
    });

    it('answers the same take when a create is retried with the same id', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = randomUUID();

      const first = await postTake(band, buildTakeBody({ id: takeId, songId }));
      const retried = await postTake(band, buildTakeBody({ id: takeId, songId }));

      expect(first.status).toBe(201);
      expect(retried.status).toBe(201);
      expect((await readJson(retried, takeEnvelope)).take.id).toBe(takeId);
      expect(await testDatabase().select().from(takeTable)).toHaveLength(1);
    });

    it('keeps one take when two tabs send the same create at the same moment', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = randomUUID();

      const answers = await Promise.all([
        postTake(band, buildTakeBody({ id: takeId, songId })),
        postTake(band, buildTakeBody({ id: takeId, songId })),
      ]);

      expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
      const takeIds = await Promise.all(
        answers.map(async (answer) => (await readJson(answer, takeEnvelope)).take.id),
      );
      expect(takeIds).toEqual([takeId, takeId]);
      expect(await testDatabase().select().from(takeTable)).toHaveLength(1);
    });

    it('refuses a take without a song', async () => {
      const band = await buildAuthenticatedApp();
      const { songId: _songId, ...withoutSong } = buildTakeBody({
        id: randomUUID(),
        songId: randomUUID(),
      });
      expect((await postTake(band, withoutSong)).status).toBe(400);
    });

    it('refuses an object key other than the one the take was signed for', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const response = await postTake(band, {
        ...buildTakeBody({ id: randomUUID(), songId }),
        objectKey: `chart/${songId}/chart.pdf`,
      });
      expect(response.status).toBe(422);
      expect(await readJson(response, errorEnvelope)).toEqual({ error: 'object-key-mismatch' });
    });

    it('answers 404 for a song or a session that does not exist', async () => {
      const band = await buildAuthenticatedApp();
      const missingSong = await postTake(
        band,
        buildTakeBody({ id: randomUUID(), songId: randomUUID() }),
      );
      expect(missingSong.status).toBe(404);
      expect(await readJson(missingSong, errorEnvelope)).toEqual({ error: 'song-not-found' });

      const songId = await createSong(band);
      const missingSession = await postTake(
        band,
        buildTakeBody({ id: randomUUID(), songId, sessionId: randomUUID() }),
      );
      expect(missingSession.status).toBe(404);
      expect(await readJson(missingSession, errorEnvelope)).toEqual({
        error: 'session-not-found',
      });
    });

    it('refuses a take for a song deleted while the take was being written', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const [deletion, creation] = await runSecondWhileFirstWaitsOnHold(
        holdWritesToTable('take'),
        async () =>
          await jsonRequest(band.app, `/api/songs/${songId}`, {
            method: 'DELETE',
            cookieHeader: band.cookieHeader,
          }),
        async () => await postTake(band, buildTakeBody({ id: randomUUID(), songId })),
      );
      expect(deletion.status).toBe(200);
      expect(creation.status).toBe(404);
      expect(await testDatabase().select().from(takeTable)).toEqual([]);
    });

    it('refuses a take for a session deleted while the take was being written', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const sessionId = await createPractice(band);
      const [deletion, creation] = await runSecondWhileFirstWaitsOnHold(
        holdWritesToTable('take'),
        async () =>
          await jsonRequest(band.app, `/api/sessions/${sessionId}`, {
            method: 'DELETE',
            cookieHeader: band.cookieHeader,
          }),
        async () => await postTake(band, buildTakeBody({ id: randomUUID(), songId, sessionId })),
      );
      expect(deletion.status).toBe(200);
      expect(creation.status).toBe(404);
      expect(await readJson(creation, errorEnvelope)).toEqual({ error: 'session-not-found' });
      expect(await testDatabase().select().from(takeTable)).toEqual([]);
    });

    it('answers the take it stored even when another connection deletes it before the answer is read', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = randomUUID();
      const creation = await runWhileWaitingOnHold(
        holdReadsOfMembers,
        async () => await postTake(band, buildTakeBody({ id: takeId, songId })),
        deleteTakeRow(takeId),
      );
      expect(creation.status).toBe(201);
      expect((await readJson(creation, takeEnvelope)).take.id).toBe(takeId);
    });

    it('writes the take once when its first commit loses a conflict on the claimed song', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const removeSimulatedConflict = await abortCommitsWritingTable('song', 1);
      try {
        const creation = await postTake(band, buildTakeBody({ id: randomUUID(), songId }));
        expect(creation.status).toBe(201);
      } finally {
        await removeSimulatedConflict();
      }
      expect(await listTakes(band, songId)).toHaveLength(1);
    });
  });

  describe('deleting a take', () => {
    it('lets any member delete another member’s take, its comments and its audio', async () => {
      const author = await buildAuthenticatedApp('Hugo');
      const otherMember = await buildAuthenticatedApp('Thomas');
      const songId = await createSong(author);
      const takeId = await createTake(author, { id: randomUUID(), songId });
      await postComment(author, takeId, { body: 'the bass comes in late' });
      const send = stubObjectDeletion();

      const response = await jsonRequest(otherMember.app, `/api/takes/${takeId}`, {
        method: 'DELETE',
        cookieHeader: otherMember.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(await listTakes(author, songId)).toEqual([]);
      expect(await testDatabase().select().from(takeCommentTable)).toEqual([]);
      expect(readDeletedObjectKeys(send)).toEqual([`take/${songId}/${takeId}.webm`]);
    });

    it('answers 404 for a take that does not exist', async () => {
      const band = await buildAuthenticatedApp();
      const response = await jsonRequest(band.app, `/api/takes/${randomUUID()}`, {
        method: 'DELETE',
        cookieHeader: band.cookieHeader,
      });
      expect(response.status).toBe(404);
    });

    it('deletes the take once when its first commit loses a conflict', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      stubObjectDeletion();
      const removeSimulatedConflict = await abortCommitsWritingTable('take', 1);
      try {
        const response = await jsonRequest(band.app, `/api/takes/${takeId}`, {
          method: 'DELETE',
          cookieHeader: band.cookieHeader,
        });
        expect(response.status).toBe(200);
      } finally {
        await removeSimulatedConflict();
      }
      expect(await listTakes(band, songId)).toEqual([]);
    });

    it('still deletes the take when the audio cannot be deleted, and reports it', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      stubStorage(() => Promise.reject(new Error('network down')));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const response = await jsonRequest(band.app, `/api/takes/${takeId}`, {
        method: 'DELETE',
        cookieHeader: band.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(await listTakes(band, songId)).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'TakeObjectDeleteFailed',
          objectKeys: [`take/${songId}/${takeId}.webm`],
          failure: 'Error',
        }),
      );
    });
  });

  describe('comments', () => {
    it('keeps a comment with a moment and one without, oldest first, and counts them', async () => {
      const band = await buildAuthenticatedApp('Hugo');
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });

      const pinned = await postComment(band, takeId, {
        body: 'the bass comes in late',
        atSeconds: 102,
      });
      const free = await postComment(band, takeId, { body: 'great energy overall' });

      expect(pinned.status).toBe(201);
      expect(free.status).toBe(201);
      expect((await readJson(pinned, commentEnvelope)).comment).toEqual({
        id: expect.any(String),
        takeId,
        memberId: band.memberId,
        authorName: 'Hugo',
        body: 'the bass comes in late',
        atSeconds: 102,
        createdAt: expect.any(String),
      });
      const listed = await readJson(
        await jsonRequest(band.app, `/api/takes/${takeId}/comments`, {
          cookieHeader: band.cookieHeader,
        }),
        commentListEnvelope,
      );
      expect(listed.comments.map((comment) => [comment.body, comment.atSeconds])).toEqual([
        ['the bass comes in late', 102],
        ['great energy overall', null],
      ]);
      expect((await listTakes(band, songId))[0]?.commentCount).toBe(2);
    });

    it('accepts a moment at the very end and refuses one a second past it', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });

      const atTheEnd = await postComment(band, takeId, {
        body: 'last chord',
        atSeconds: DURATION_SECONDS,
      });
      const pastTheEnd = await postComment(band, takeId, {
        body: 'after the end',
        atSeconds: DURATION_SECONDS + 1,
      });

      expect(atTheEnd.status).toBe(201);
      expect(pastTheEnd.status).toBe(422);
      expect(await readJson(pastTheEnd, errorEnvelope)).toEqual({ error: 'moment-past-end' });
    });

    it('answers 404 when commenting on, or reading the comments of, a take that does not exist', async () => {
      const band = await buildAuthenticatedApp();
      const missingTake = randomUUID();
      expect((await postComment(band, missingTake, { body: 'hello' })).status).toBe(404);
      const listed = await jsonRequest(band.app, `/api/takes/${missingTake}/comments`, {
        cookieHeader: band.cookieHeader,
      });
      expect(listed.status).toBe(404);
    });

    it('leaves no comment on a take deleted while the comment was being written', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      stubObjectDeletion();
      const [deletion] = await runSecondWhileFirstWaitsOnHold(
        holdWritesToTable('take'),
        async () =>
          await jsonRequest(band.app, `/api/takes/${takeId}`, {
            method: 'DELETE',
            cookieHeader: band.cookieHeader,
          }),
        async () => await postComment(band, takeId, { body: 'the bass comes in late' }),
      );
      expect(deletion.status).toBe(200);
      expect(await testDatabase().select().from(takeCommentTable)).toEqual([]);
    });

    it('answers the comment it stored even when another connection deletes it before the answer is read', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      const creation = await runWhileWaitingOnHold(
        holdReadsOfMembers,
        async () => await postComment(band, takeId, { body: 'the bass comes in late' }),
        deleteCommentsOfTake(takeId),
      );
      expect(creation.status).toBe(201);
      expect((await readJson(creation, commentEnvelope)).comment.body).toBe(
        'the bass comes in late',
      );
    });

    it('writes one comment when its first commit loses a conflict', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      const removeSimulatedConflict = await abortCommitsWritingTable('take_comment', 1);
      try {
        const creation = await postComment(band, takeId, { body: 'the bass comes in late' });
        expect(creation.status).toBe(201);
      } finally {
        await removeSimulatedConflict();
      }
      expect(await testDatabase().select().from(takeCommentTable)).toHaveLength(1);
    });

    it('edits a comment’s body and moment, and refuses a moment past the end', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      const commentId = (
        await readJson(await postComment(band, takeId, { body: 'late' }), commentEnvelope)
      ).comment.id;
      const path = `/api/takes/${takeId}/comments/${commentId}`;

      const edited = await jsonRequest(band.app, path, {
        method: 'PATCH',
        body: { body: 'the bass comes in late', atSeconds: 102 },
        cookieHeader: band.cookieHeader,
      });
      const pastTheEnd = await jsonRequest(band.app, path, {
        method: 'PATCH',
        body: { atSeconds: DURATION_SECONDS + 1 },
        cookieHeader: band.cookieHeader,
      });
      const cleared = await jsonRequest(band.app, path, {
        method: 'PATCH',
        body: { atSeconds: null },
        cookieHeader: band.cookieHeader,
      });

      expect((await readJson(edited, commentEnvelope)).comment).toMatchObject({
        body: 'the bass comes in late',
        atSeconds: 102,
      });
      expect(pastTheEnd.status).toBe(422);
      expect((await readJson(cleared, commentEnvelope)).comment).toMatchObject({
        body: 'the bass comes in late',
        atSeconds: null,
      });
    });

    it('answers 404 when editing a comment that does not exist, or one of another take', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      const otherTakeId = await createTake(band, { id: randomUUID(), songId });
      const commentId = (
        await readJson(await postComment(band, takeId, { body: 'late' }), commentEnvelope)
      ).comment.id;

      const onOtherTake = await jsonRequest(
        band.app,
        `/api/takes/${otherTakeId}/comments/${commentId}`,
        { method: 'PATCH', body: { body: 'moved' }, cookieHeader: band.cookieHeader },
      );
      const onMissingTake = await jsonRequest(
        band.app,
        `/api/takes/${randomUUID()}/comments/${commentId}`,
        { method: 'PATCH', body: { body: 'moved' }, cookieHeader: band.cookieHeader },
      );

      expect(onOtherTake.status).toBe(404);
      expect(await readJson(onOtherTake, errorEnvelope)).toEqual({ error: 'comment-not-found' });
      expect(onMissingTake.status).toBe(404);
      expect(await readJson(onMissingTake, errorEnvelope)).toEqual({ error: 'take-not-found' });
    });

    it('lets another member delete a comment, once', async () => {
      const author = await buildAuthenticatedApp('Hugo');
      const otherMember = await buildAuthenticatedApp('Thomas');
      const songId = await createSong(author);
      const takeId = await createTake(author, { id: randomUUID(), songId });
      const commentId = (
        await readJson(await postComment(author, takeId, { body: 'late' }), commentEnvelope)
      ).comment.id;
      const path = `/api/takes/${takeId}/comments/${commentId}`;

      const first = await jsonRequest(otherMember.app, path, {
        method: 'DELETE',
        cookieHeader: otherMember.cookieHeader,
      });
      const second = await jsonRequest(otherMember.app, path, {
        method: 'DELETE',
        cookieHeader: otherMember.cookieHeader,
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(404);
    });
  });

  describe('when what a take belongs to is deleted', () => {
    it('deleting the song deletes its takes, their comments and their audio', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const otherSongId = await createSong(band);
      const firstTake = await createTake(band, { id: randomUUID(), songId });
      const secondTake = await createTake(band, { id: randomUUID(), songId });
      const keptTake = await createTake(band, { id: randomUUID(), songId: otherSongId });
      await postComment(band, firstTake, { body: 'late' });
      const send = stubObjectDeletion();

      const response = await jsonRequest(band.app, `/api/songs/${songId}`, {
        method: 'DELETE',
        cookieHeader: band.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(
        (await testDatabase().select({ id: takeTable.id }).from(takeTable)).map((row) => row.id),
      ).toEqual([keptTake]);
      expect(await testDatabase().select().from(takeCommentTable)).toEqual([]);
      expect(readDeletedObjectKeys(send).toSorted()).toEqual(
        [`take/${songId}/${firstTake}.webm`, `take/${songId}/${secondTake}.webm`].toSorted(),
      );
    });

    it('leaves no comment on a take whose song is deleted while the comment was being written', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const takeId = await createTake(band, { id: randomUUID(), songId });
      stubObjectDeletion();
      const [, deletion] = await runSecondWhileFirstWaitsOnHold(
        holdTakeRow(takeId),
        async () => await postComment(band, takeId, { body: 'the bass comes in late' }),
        async () =>
          await jsonRequest(band.app, `/api/songs/${songId}`, {
            method: 'DELETE',
            cookieHeader: band.cookieHeader,
          }),
      );
      expect(deletion.status).toBe(200);
      expect(await testDatabase().select().from(takeCommentTable)).toEqual([]);
    });

    it('deleting a song with no take reaches no storage', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const send = stubObjectDeletion();

      await jsonRequest(band.app, `/api/songs/${songId}`, {
        method: 'DELETE',
        cookieHeader: band.cookieHeader,
      });

      expect(send).not.toHaveBeenCalled();
    });

    it('deleting the session keeps its takes and clears their session', async () => {
      const band = await buildAuthenticatedApp();
      const songId = await createSong(band);
      const sessionId = await createPractice(band);
      const takeId = await createTake(band, { id: randomUUID(), songId, sessionId });

      const response = await jsonRequest(band.app, `/api/sessions/${sessionId}`, {
        method: 'DELETE',
        cookieHeader: band.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(await listTakes(band, songId)).toEqual([
        expect.objectContaining({ id: takeId, sessionId: null }),
      ]);
    });

    it('deleting the author keeps their takes and comments, with no name to show', async () => {
      const author = await buildAuthenticatedApp('Emma');
      const otherMember = await buildAuthenticatedApp('Thomas');
      const songId = await createSong(author);
      const takeId = await createTake(author, { id: randomUUID(), songId });
      await postComment(author, takeId, { body: 'late' });

      const response = await jsonRequest(otherMember.app, `/api/members/${author.memberId}`, {
        method: 'DELETE',
        cookieHeader: otherMember.cookieHeader,
      });

      expect(response.status).toBe(200);
      expect(await listTakes(otherMember, songId)).toEqual([
        expect.objectContaining({ id: takeId, authorName: null, commentCount: 1 }),
      ]);
      const comments = await readJson(
        await jsonRequest(otherMember.app, `/api/takes/${takeId}/comments`, {
          cookieHeader: otherMember.cookieHeader,
        }),
        commentListEnvelope,
      );
      expect(comments.comments).toEqual([expect.objectContaining({ authorName: null })]);
      expect(
        await testDatabase().select().from(takeTable).where(eq(takeTable.id, takeId)),
      ).toHaveLength(1);
    });
  });
});
