import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
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
const RECORDED_AT = '2026-10-18T20:00:00.000Z';

const idBodySchema = z.object({ id: z.string().uuid() });
const uploadBodySchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});
const takesBodySchema = z.object({
  takes: z.array(z.object({ id: z.string().uuid(), by: z.string(), comments: z.number() })),
  total: z.number(),
});
const commentBodySchema = z.object({ comment: z.object({ id: z.string().uuid() }) });

async function createSong(band: AssistantBand): Promise<string> {
  const reply = await callTool(band.assistant, 'save_song', { title: 'Creep', status: 'idea' });
  return idBodySchema.parse(reply.body).id;
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
    song: songId,
    contentType: 'audio/mpeg',
    contentLength: FILE_BYTES,
  });
  const { objectKey } = uploadBodySchema.parse(upload.body);
  const created = await callTool(
    band.assistant,
    'create_take',
    buildTakeArguments(takeId, songId, objectKey),
  );
  return idBodySchema.parse(created.body).id;
}

async function commentOnTake(band: AssistantBand, takeId: string): Promise<string> {
  const response = await jsonRequest(band.lea.app, `/api/takes/${takeId}/comments`, {
    method: 'POST',
    cookieHeader: band.lea.cookieHeader,
    body: { body: 'The bridge drags', atSeconds: MOMENT_SECONDS },
  });
  return (await readJson(response, commentBodySchema)).comment.id;
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
      song: 'Creep',
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
      (await callTool(band.assistant, 'list_takes', { song: 'creep' })).body,
    );
    const { takes } = await readTakeRows(takeId);

    expect(upload.isError).toBe(false);
    expect(signed.objectKey).toBe(`take/${songId}/${takeId}.mp3`);
    expect(new URL(signed.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toContain(
      'content-length',
    );
    expect(upload.body).toMatchObject({ songId });
    expect(created).toEqual({ isError: false, body: { id: takeId } });
    expect(listed).toEqual({
      takes: [expect.objectContaining({ id: takeId, by: 'Hugo', comments: 0 })],
      total: 1,
    });
    expect(takes.map((take) => [take.memberId, take.objectKey])).toEqual([
      [band.hugo.memberId, signed.objectKey],
    ]);
  });

  it('reads the latest take of a song with its comments in recording order', async () => {
    const band = await prepareAssistantBand();
    const takeId = await uploadTake(band, await createSong(band));
    const commentId = await commentOnTake(band, takeId);

    const read = await callTool(band.assistant, 'get_take', { song: 'creep' });

    expect(read.body).toEqual({
      take: expect.objectContaining({ id: takeId, by: 'Hugo', comments: 1 }),
      comments: [{ id: commentId, by: 'Léa', body: 'The bridge drags', atSeconds: MOMENT_SECONDS }],
    });
  });

  it('deletes a take with its comments and its audio file', async () => {
    const band = await prepareAssistantBand();
    const takeId = await uploadTake(band, await createSong(band));
    await commentOnTake(band, takeId);
    const send = stubObjectDeletion();

    const deleted = await callTool(band.assistant, 'delete', { kind: 'take', id: takeId });

    expect(deleted).toEqual({ isError: false, body: { id: takeId, deleted: true } });
    expect(await readTakeRows(takeId)).toEqual({ takes: [], comments: [] });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const songId = await createSong(band);
    await uploadTake(band, songId);
    stubObjectDeletion();

    const replies = {
      unknownSongUpload: await callTool(band.assistant, 'request_take_upload', {
        takeId: unknownId,
        song: unknownId,
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
      missingComments: await callTool(band.assistant, 'get_take', { take: unknownId }),
      noChoice: await callTool(band.assistant, 'get_take', {}),
      missingTakeDelete: await callTool(band.assistant, 'delete', { kind: 'take', id: unknownId }),
    };
    await callTool(band.assistant, 'save_song', { title: 'Karma Police', status: 'idea' });
    const namedTakeDelete = await callTool(band.assistant, 'delete', { kind: 'take', id: 'Creep' });
    const songWithoutTake = await callTool(band.assistant, 'get_take', { song: 'Karma Police' });

    expect(replies).toEqual({
      unknownSongUpload: refused('song-not-found'),
      mismatchedKey: refused('object-key-mismatch'),
      unknownSongTake: refused('song-not-found'),
      unknownSessionTake: refused('session-not-found'),
      missingComments: refused('take-not-found'),
      noChoice: refused('take-or-song-required'),
      missingTakeDelete: refused('not-found'),
    });
    expect(namedTakeDelete).toEqual({
      isError: true,
      body: { error: 'take-not-found', reference: 'Creep' },
    });
    expect(songWithoutTake).toEqual({
      isError: true,
      body: { error: 'take-not-found', song: 'Karma Police' },
    });
  });

  it('pushes a new take to the other members only', async () => {
    const band = await prepareAssistantBand();
    const songId = await createSong(band);
    band.send.mockClear();

    await uploadTake(band, songId);
    const sent = readSentNotifications(band.send);

    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
    ]);
  });
});
