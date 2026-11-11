import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUnhandledErrorAnswer } from './unhandled-error.middleware';
import { addWideEventFields } from './wide-event.adapter';
import { recordWideEvents } from './wide-event.middleware';

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWrittenEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.map(([line]) => {
    const writtenEvent: unknown = JSON.parse(String(line));
    return writtenEvent;
  });
}

function readRequestId(writtenEvent: unknown): unknown {
  const hasRequestId =
    typeof writtenEvent === 'object' && writtenEvent !== null && 'request.id' in writtenEvent;
  return hasRequestId ? writtenEvent['request.id'] : undefined;
}

interface RecordedApp {
  readonly app: Hono;
  readonly settleLateWork: () => Promise<unknown>;
}

function buildRecordedApp(): RecordedApp {
  const lateWork: Promise<void>[] = [];
  const songs = new Hono()
    .get('/:songId', (context) => {
      addWideEventFields({ 'member.id': 'member-1' });
      return context.json({ ok: true });
    })
    .get('/:songId/missing', (context) => context.json({ error: 'song-not-found' }, 404));
  const app = new Hono()
    .use('*', recordWideEvents)
    .onError(buildUnhandledErrorAnswer(vi.fn()))
    .route('/api/songs', songs)
    .get('/api/fail', () => {
      throw new TypeError('cannot read the song');
    })
    .get('/api/late', (context) => {
      lateWork.push(
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }).then(() => {
          addWideEventFields({ 'realtime.broadcast_failure': 'AggregateError' });
        }),
      );
      return context.json({ ok: true });
    });
  app.post('/api/read-batch', async (context) => {
    const reads = await Promise.all(
      ['/api/songs/1', '/api/songs/2/missing'].map(
        async (path) => await app.fetch(new Request(`http://localhost${path}`), context.env),
      ),
    );
    return context.json(reads.map((read) => read.status));
  });
  return { app, settleLateWork: async () => await Promise.all(lateWork) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-middleware-integration
describe('recordWideEvents', () => {
  it('writes one event per request with its route, status, outcome and the fields its handlers added', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().app.request('/api/songs/42?search=secret');

    expect(response.status).toBe(200);
    const events = readWrittenEvents(write);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      'service.name': 'pragma-api',
      'event.kind': 'http',
      'request.id': expect.stringMatching(UUID_PATTERN),
      'http.request.method': 'GET',
      'http.route': '/api/songs/:songId',
      'http.response.status_code': 200,
      duration_ms: expect.any(Number),
      outcome: 'success',
      'member.id': 'member-1',
    });
    expect(JSON.stringify(events[0])).not.toContain('secret');
  });

  it('records a refusal as refused, with no error fields', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().app.request('/api/songs/42/missing');

    expect(response.status).toBe(404);
    const [event] = readWrittenEvents(write);
    expect(event).toMatchObject({
      'http.route': '/api/songs/:songId/missing',
      'http.response.status_code': 404,
      outcome: 'refused',
    });
    expect(event).not.toHaveProperty('error.type');
  });

  it('records the error behind a 500 as error fields', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().app.request('/api/fail');

    expect(response.status).toBe(500);
    expect(readWrittenEvents(write)).toMatchObject([
      {
        'http.route': '/api/fail',
        'http.response.status_code': 500,
        outcome: 'failed',
        'error.type': 'TypeError',
        'error.message': 'cannot read the song',
        'error.stack': expect.stringContaining('TypeError: cannot read the song'),
      },
    ]);
  });

  it('writes each read of a batch as its own event whose parent is the batch', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().app.request('/api/read-batch', { method: 'POST' });

    expect(await response.json()).toEqual([200, 404]);
    const events = readWrittenEvents(write);
    expect(events).toHaveLength(3);
    const batchEvent = events.at(-1);
    expect(batchEvent).toMatchObject({ 'http.route': '/api/read-batch', outcome: 'success' });
    expect(batchEvent).not.toHaveProperty('request.parent_id');
    const batchRequestId = readRequestId(batchEvent);
    expect(batchRequestId).toMatch(UUID_PATTERN);
    expect(events.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'http.route': '/api/songs/:songId',
          'request.parent_id': batchRequestId,
        }),
        expect.objectContaining({
          'http.route': '/api/songs/:songId/missing',
          'request.parent_id': batchRequestId,
        }),
      ]),
    );
    expect(batchEvent).not.toHaveProperty('member.id');
  });

  it('writes a field added after the answer left on a detached line naming the request', async () => {
    const write = captureWrittenLines();
    const { app, settleLateWork } = buildRecordedApp();

    await app.request('/api/late');
    await settleLateWork();

    const [requestEvent, detachedEvent] = readWrittenEvents(write);
    expect(requestEvent).not.toHaveProperty('realtime.broadcast_failure');
    expect(detachedEvent).toMatchObject({
      'event.kind': 'detached',
      'request.id': readRequestId(requestEvent),
      'realtime.broadcast_failure': 'AggregateError',
    });
  });
});
