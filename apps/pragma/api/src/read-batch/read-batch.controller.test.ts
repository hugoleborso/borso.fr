import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson, TEST_HOST } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import * as errorReporting from '../helpers/observability/error-reporting.adapter';
import * as instrumentsService from '../instruments/instruments.service';
import * as songsService from '../songs/songs.service';

const READ_BATCH_PATH = '/api/read-batch';
const MOST_READS_PER_BATCH = 10;

const answerSchema = z.strictObject({
  status: z.number().int(),
  contentType: z.string().nullable(),
  body: z.string(),
});
const readBatchAnswerEnvelope = z.strictObject({ answers: z.array(answerSchema) });
const refusalEnvelope = z.object({ error: z.string() });

function read(path: string, headers: Readonly<Record<string, string>> = {}) {
  return { path, headers };
}

async function sendBatch(
  app: Parameters<typeof jsonRequest>[0],
  reads: readonly unknown[],
  cookieHeader?: string,
) {
  return await jsonRequest(app, READ_BATCH_PATH, {
    method: 'POST',
    body: { reads },
    ...(cookieHeader === undefined ? {} : { cookieHeader }),
  });
}

async function readText(
  app: Parameters<typeof jsonRequest>[0],
  path: string,
  cookieHeader: string,
): Promise<string> {
  const response = await jsonRequest(app, path, { cookieHeader });
  return await response.text();
}

// @FollowsBlueprint test-back-e2e
describe('read batch controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers three reads in order, each with the body its own GET answers', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Guitar', family: 'harmonic' },
      cookieHeader,
    });
    const paths = ['/api/instruments', '/api/songs', '/api/members'];

    const response = await sendBatch(
      app,
      paths.map((path) => read(path)),
      cookieHeader,
    );

    expect(response.status).toBe(200);
    const { answers } = await readJson(response, readBatchAnswerEnvelope);
    expect(answers.map((answer) => answer.status)).toStrictEqual([200, 200, 200]);
    expect(answers.map((answer) => answer.contentType)).toStrictEqual([
      'application/json',
      'application/json',
      'application/json',
    ]);
    const directBodies = await Promise.all(paths.map((path) => readText(app, path, cookieHeader)));
    expect(answers.map((answer) => answer.body)).toStrictEqual(directBodies);
    expect(answers[0]?.body).toContain('Guitar');
  });

  it('answers ten reads at once, as many as the database pool holds', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const reads = Array.from({ length: MOST_READS_PER_BATCH }, (_, index) =>
      read(index % 2 === 0 ? '/api/songs' : '/api/sessions'),
    );

    const response = await sendBatch(app, reads, cookieHeader);

    const { answers } = await readJson(response, readBatchAnswerEnvelope);
    expect(answers.map((answer) => answer.status)).toStrictEqual(
      Array.from({ length: MOST_READS_PER_BATCH }, () => 200),
    );
  });

  it('fails only the gated read when the batch carries no cookie', async () => {
    const { app } = await buildAuthenticatedApp();

    const response = await sendBatch(app, [read('/api/songs'), read('/api/audience/live')]);

    expect(response.status).toBe(200);
    const { answers } = await readJson(response, readBatchAnswerEnvelope);
    expect(answers.map((answer) => answer.status)).toStrictEqual([401, 200]);
    expect(JSON.parse(answers[0]?.body ?? '')).toStrictEqual({ error: 'session-required' });
    expect(JSON.parse(answers[1]?.body ?? '')).toStrictEqual({ sessionId: null });
  });

  it('answers 500 for a read that throws while the others answer 200', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    vi.spyOn(songsService, 'getSongs').mockRejectedValue(new Error('songs unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await sendBatch(
      app,
      [read('/api/instruments'), read('/api/songs'), read('/api/members')],
      cookieHeader,
    );

    expect(response.status).toBe(200);
    const { answers } = await readJson(response, readBatchAnswerEnvelope);
    expect(answers.map((answer) => answer.status)).toStrictEqual([200, 500, 200]);
  });

  it.each([
    [
      'eleven reads',
      Array.from({ length: MOST_READS_PER_BATCH + 1 }, () => read('/api/instruments')),
    ],
    ['a write method on a read', [{ ...read('/api/instruments'), method: 'POST' }]],
    ['a path outside the API', [read('/mcp')]],
    ['the batch path as a read', [read(READ_BATCH_PATH)]],
    ['a cookie header on a read', [read('/api/instruments', { cookie: 'x' })]],
    ['no reads', []],
  ])('refuses %s with 400 and runs nothing', async (_case, reads) => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const listInstruments = vi.spyOn(instrumentsService, 'getInstrumentsSorted');
    const reportFailure = vi.spyOn(errorReporting, 'reportTaggedFailure');

    const response = await sendBatch(app, reads, cookieHeader);

    expect(response.status).toBe(400);
    expect(await readJson(response, refusalEnvelope)).toStrictEqual({
      error: 'read-batch-invalid',
    });
    expect(listInstruments).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith({
      name: 'read-batch-invalid',
      tags: { route: READ_BATCH_PATH },
    });
  });

  it('refuses a body that is not JSON with 400', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    const response = await app.request(`${TEST_HOST}${READ_BATCH_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieHeader },
      body: '{"reads": [',
    });

    expect(response.status).toBe(400);
  });

  it('serves the batch on POST only', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    const response = await jsonRequest(app, READ_BATCH_PATH, { cookieHeader });

    expect(response.status).toBe(404);
  });
});
