import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addWideEventFields } from './wide-event.adapter';
import { recordWideEvents } from './wide-event.middleware';

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;
const INTERNAL_SERVER_ERROR_STATUS = 500;

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWrittenEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.map(([line]) => {
    const writtenEvent: unknown = JSON.parse(String(line));
    return writtenEvent;
  });
}

function buildRecordedApp(): Hono {
  const rows = new Hono()
    .get('/:rowId', (context) => {
      addWideEventFields({ 'rows.read': 1 });
      return context.json({ ok: true });
    })
    .get('/:rowId/missing', (context) => context.json({ error: 'row-not-found' }, 404));
  return new Hono()
    .use('*', recordWideEvents)
    .onError((_failure, context) =>
      context.text('Internal Server Error', INTERNAL_SERVER_ERROR_STATUS),
    )
    .route('/api/rows', rows)
    .get('/api/fail', () => {
      throw new TypeError('cannot read the row');
    });
}

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-middleware-integration
describe('recordWideEvents', () => {
  it('writes one event per request with its route, status, outcome and the fields its handlers added', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().request('/api/rows/42?search=secret');

    expect(response.status).toBe(200);
    const events = readWrittenEvents(write);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      'service.name': 'banana-rush-api',
      'event.kind': 'http',
      'request.id': expect.stringMatching(UUID_PATTERN),
      'http.request.method': 'GET',
      'http.route': '/api/rows/:rowId',
      'http.response.status_code': 200,
      duration_ms: expect.any(Number),
      outcome: 'success',
      'rows.read': 1,
    });
    expect(JSON.stringify(events[0])).not.toContain('secret');
  });

  it('records a refusal as refused, with no error fields', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().request('/api/rows/42/missing');

    expect(response.status).toBe(404);
    const [event] = readWrittenEvents(write);
    expect(event).toMatchObject({
      'http.route': '/api/rows/:rowId/missing',
      'http.response.status_code': 404,
      outcome: 'refused',
    });
    expect(event).not.toHaveProperty('error.type');
  });

  it('records the error behind a 500 as error fields', async () => {
    const write = captureWrittenLines();

    const response = await buildRecordedApp().request('/api/fail');

    expect(response.status).toBe(INTERNAL_SERVER_ERROR_STATUS);
    expect(readWrittenEvents(write)).toMatchObject([
      {
        'http.route': '/api/fail',
        'http.response.status_code': INTERNAL_SERVER_ERROR_STATUS,
        outcome: 'failed',
        'error.type': 'TypeError',
        'error.message': 'cannot read the row',
        'error.stack': expect.stringContaining('TypeError: cannot read the row'),
      },
    ]);
  });
});
