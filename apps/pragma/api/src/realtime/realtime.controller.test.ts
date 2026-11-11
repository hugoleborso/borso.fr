import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { getAppConfig } from '../auth/auth.service';
import type { TaggedFailure } from '../helpers/observability/error-reporting.adapter';
import { GONE_STATUS_CODE } from './broadcast.adapter';
import { useConnectionPoster } from './connection-poster.setup';
import { realtimeConnectionTable } from './realtime.schema';
import { buildRealtimeTicket, REALTIME_TICKET_TTL_MS } from './realtime-ticket.utils';
import { handler as answerSocketEvent } from '../main.websocket';
import { buildSocketReply } from './realtime.service';

const ticketGrantSchema = z.object({ url: z.string().nullable(), ticket: z.string() }).strict();
const CLIENT_URL = 'wss://socket.pragma.test/prod';
const WRITER_TAB = 'tab-writer';
const READER_TAB = 'tab-reader';
const SHORT_BUDGET_MILLISECONDS = 20;

interface Post {
  readonly connectionId: string;
  readonly data: unknown;
}

function buildRecordingPoster(answer: (connectionId: string) => Promise<unknown>) {
  const posts: Post[] = [];
  useConnectionPoster({
    postToConnection: async ({ ConnectionId, Data }) => {
      posts.push({ connectionId: ConnectionId, data: JSON.parse(Data) });
      return await answer(ConnectionId);
    },
  });
  return posts;
}

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWriteEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.flatMap(([line]) => {
    const writtenEvent: unknown = JSON.parse(String(line));
    const isWriteEvent =
      typeof writtenEvent === 'object' &&
      writtenEvent !== null &&
      'http.request.method' in writtenEvent &&
      writtenEvent['http.request.method'] === 'POST';
    return isWriteEvent ? [writtenEvent] : [];
  });
}

async function settlePendingWork(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function buildReportingApp(budgetMilliseconds = 1_000) {
  const reportFailure = vi.fn<(failure: TaggedFailure) => void>();
  return { app: createApp({ realtime: { reportFailure, budgetMilliseconds } }), reportFailure };
}

async function readHmacKey(): Promise<Buffer> {
  const config = await getAppConfig();
  if (config === null) throw new Error('auth was not bootstrapped');
  return config.hmacKey;
}

async function connect(connectionId: string, query: Record<string, string> | null) {
  return await buildSocketReply({
    requestContext: { connectionId, routeKey: '$connect' },
    queryStringParameters: query,
  });
}

async function connectTab(connectionId: string, memberId: string, clientId: string) {
  const ticket = buildRealtimeTicket(await readHmacKey(), memberId, Date.now());
  return await connect(connectionId, { ticket, client: clientId });
}

async function listConnectionIds(): Promise<string[]> {
  const rows = await testDatabase().select().from(realtimeConnectionTable);
  return rows.map((row) => row.connectionId).sort();
}

async function createTask(app: ReturnType<typeof createApp>, cookieHeader: string) {
  return await jsonRequest(app, '/api/tasks', {
    method: 'POST',
    cookieHeader,
    body: { title: 'Restring the bass' },
    extraHeaders: { 'X-Pragma-Client': WRITER_TAB },
  });
}

// @FollowsBlueprint test-back-e2e
describe('the realtime ticket (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses a ticket to a request without a session', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/realtime/ticket')).status).toBe(401);
  });

  it('names no socket where none is configured, so the tab stays without one', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const grant = await readJson(
      await jsonRequest(app, '/api/realtime/ticket', { cookieHeader }),
      ticketGrantSchema,
    );
    expect(grant.url).toBeNull();
  });

  it('answers the socket address and a ticket that opens it for the member', async () => {
    vi.stubEnv('WEBSOCKET_CLIENT_URL', CLIENT_URL);
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const grant = await readJson(
      await jsonRequest(app, '/api/realtime/ticket', { cookieHeader }),
      ticketGrantSchema,
    );
    expect(grant.url).toBe(CLIENT_URL);

    expect(await connect('c1', { ticket: grant.ticket, client: READER_TAB })).toStrictEqual({
      statusCode: 200,
    });
    const rows = await testDatabase().select().from(realtimeConnectionTable);
    expect(rows.map((row) => [row.connectionId, row.memberId, row.clientId])).toStrictEqual([
      ['c1', memberId, READER_TAB],
    ]);
  });
});

describe('the socket routes (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('refuses a connection carrying no ticket', async () => {
    await buildAuthenticatedApp();
    expect(await connect('c1', { client: READER_TAB })).toStrictEqual({ statusCode: 400 });
    expect(await listConnectionIds()).toStrictEqual([]);
  });

  it('refuses a forged ticket', async () => {
    const { memberId } = await buildAuthenticatedApp();
    const forged = buildRealtimeTicket(Buffer.alloc(32), memberId, Date.now());
    expect(await connect('c1', { ticket: forged, client: READER_TAB })).toStrictEqual({
      statusCode: 401,
    });
    expect(await listConnectionIds()).toStrictEqual([]);
  });

  it('refuses an expired ticket', async () => {
    const { memberId } = await buildAuthenticatedApp();
    const expired = buildRealtimeTicket(
      await readHmacKey(),
      memberId,
      Date.now() - REALTIME_TICKET_TTL_MS - 1,
    );
    expect(await connect('c1', { ticket: expired, client: READER_TAB })).toStrictEqual({
      statusCode: 401,
    });
  });

  it('writes each socket event as one event holding its route, status and outcome', async () => {
    const { memberId } = await buildAuthenticatedApp();
    const forged = buildRealtimeTicket(Buffer.alloc(32), memberId, Date.now());
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const reply = await answerSocketEvent({
      requestContext: { connectionId: 'c1', routeKey: '$connect' },
      queryStringParameters: { ticket: forged, client: READER_TAB },
    });

    const writtenEvents = write.mock.calls.map(([line]) => {
      const writtenEvent: unknown = JSON.parse(String(line));
      return writtenEvent;
    });
    write.mockRestore();
    expect(reply).toStrictEqual({ statusCode: 401 });
    expect(writtenEvents).toStrictEqual([
      expect.objectContaining({
        'event.kind': 'socket',
        'socket.route_key': '$connect',
        'socket.status_code': 401,
        outcome: 'refused',
      }),
    ]);
  });

  it('refuses a session cookie offered as a ticket', async () => {
    const { cookieHeader } = await buildAuthenticatedApp();
    const cookieValue = cookieHeader.slice(cookieHeader.indexOf('=') + 1);
    expect(await connect('c1', { ticket: cookieValue, client: READER_TAB })).toStrictEqual({
      statusCode: 401,
    });
  });

  it('forgets a connection on disconnect and touches nothing on any other route', async () => {
    const { memberId } = await buildAuthenticatedApp();
    await connectTab('c1', memberId, READER_TAB);
    await connectTab('c2', memberId, WRITER_TAB);

    expect(
      await buildSocketReply({ requestContext: { connectionId: 'c1', routeKey: '$default' } }),
    ).toStrictEqual({ statusCode: 200 });
    expect(await listConnectionIds()).toStrictEqual(['c1', 'c2']);

    expect(
      await buildSocketReply({ requestContext: { connectionId: 'c1', routeKey: '$disconnect' } }),
    ).toStrictEqual({ statusCode: 200 });
    expect(await listConnectionIds()).toStrictEqual(['c2']);
  });
});

describe('telling the other tabs a write made their data stale (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    useConnectionPoster(null);
    vi.restoreAllMocks();
  });

  it('posts the root the write touched to every tab but the writer’s own', async () => {
    const posts = buildRecordingPoster(() => Promise.resolve({}));
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app, reportFailure } = buildReportingApp();
    await connectTab('reader', memberId, READER_TAB);
    await connectTab('writer', memberId, WRITER_TAB);
    const write = captureWrittenLines();

    expect((await createTask(app, cookieHeader)).status).toBe(201);

    expect(posts).toStrictEqual([
      { connectionId: 'reader', data: { kind: 'stale', written: ['tasks'] } },
    ]);
    expect(reportFailure).not.toHaveBeenCalled();
    expect(readWriteEvents(write)).toStrictEqual([
      expect.objectContaining({ 'realtime.broadcast_outcome': 'delivered' }),
    ]);
  });

  it('tells every tab when the write carries no tab id', async () => {
    const posts = buildRecordingPoster(() => Promise.resolve({}));
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app } = buildReportingApp();
    await connectTab('reader', memberId, READER_TAB);
    await connectTab('writer', memberId, WRITER_TAB);

    await jsonRequest(app, '/api/setlists', {
      method: 'POST',
      cookieHeader,
      body: { name: 'Summer' },
    });

    expect(posts.map((post) => post.connectionId).sort()).toStrictEqual(['reader', 'writer']);
    expect(posts[0]?.data).toStrictEqual({ kind: 'stale', written: ['setlists'] });
  });

  it('posts nothing for a read or for a write the API refused', async () => {
    const posts = buildRecordingPoster(() => Promise.resolve({}));
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app } = buildReportingApp();
    await connectTab('reader', memberId, READER_TAB);

    await jsonRequest(app, '/api/tasks', { cookieHeader });
    const refused = await jsonRequest(app, '/api/tasks', {
      method: 'POST',
      cookieHeader,
      body: {},
    });

    expect(refused.status).toBe(400);
    expect(posts).toStrictEqual([]);
  });

  it('forgets a connection API Gateway reports gone', async () => {
    buildRecordingPoster(async (connectionId) =>
      connectionId === 'gone'
        ? await Promise.reject(
            Object.assign(new Error('Gone'), { $metadata: { httpStatusCode: GONE_STATUS_CODE } }),
          )
        : {},
    );
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app, reportFailure } = buildReportingApp();
    await connectTab('gone', memberId, READER_TAB);
    await connectTab('alive', memberId, READER_TAB);

    expect((await createTask(app, cookieHeader)).status).toBe(201);

    expect(await listConnectionIds()).toStrictEqual(['alive']);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('reports a send that fails and still answers the write', async () => {
    buildRecordingPoster(() => Promise.reject(new RangeError('gateway down')));
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app, reportFailure } = buildReportingApp();
    await connectTab('reader', memberId, READER_TAB);
    const write = captureWrittenLines();

    expect((await createTask(app, cookieHeader)).status).toBe(201);

    expect(reportFailure).toHaveBeenCalledExactlyOnceWith({
      name: 'RealtimeBroadcastFailed',
      tags: { 'realtime.written': 'tasks', 'realtime.code': 'AggregateError' },
    });
    expect(readWriteEvents(write)).toStrictEqual([
      expect.objectContaining({
        'realtime.broadcast_outcome': 'failed',
        'realtime.broadcast_failure': ['AggregateError'],
        'realtime.broadcast_failure_message': ['RealtimeBroadcastFailed'],
      }),
    ]);
    expect(await listConnectionIds()).toStrictEqual(['reader']);
  });

  it('reports a send that outlives its budget and answers the write without waiting for it', async () => {
    buildRecordingPoster(() => new Promise(() => undefined));
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app, reportFailure } = buildReportingApp(SHORT_BUDGET_MILLISECONDS);
    await connectTab('reader', memberId, READER_TAB);
    const write = captureWrittenLines();

    expect((await createTask(app, cookieHeader)).status).toBe(201);

    expect(reportFailure).toHaveBeenCalledExactlyOnceWith({
      name: 'RealtimeBroadcastLate',
      tags: { 'realtime.written': 'tasks' },
    });
    expect(readWriteEvents(write)).toStrictEqual([
      expect.objectContaining({ 'realtime.broadcast_outcome': 'late' }),
    ]);
  });

  it('keeps a send that fails after its budget as late and writes no second line for it', async () => {
    const pendingRejections: ((reason: Error) => void)[] = [];
    const failLateSend = () => {
      for (const reject of pendingRejections) reject(new RangeError('gateway down'));
    };
    buildRecordingPoster(
      async () =>
        await new Promise((_resolve, reject) => {
          pendingRejections.push(reject);
        }),
    );
    const { cookieHeader, memberId } = await buildAuthenticatedApp();
    const { app, reportFailure } = buildReportingApp(SHORT_BUDGET_MILLISECONDS);
    reportFailure.mockImplementation(() => {
      failLateSend();
    });
    await connectTab('reader', memberId, READER_TAB);
    const write = captureWrittenLines();

    expect((await createTask(app, cookieHeader)).status).toBe(201);
    const linesAtAnswer = write.mock.calls.length;
    failLateSend();
    await settlePendingWork();

    expect(write).toHaveBeenCalledTimes(linesAtAnswer);
    const writeEvents = readWriteEvents(write);
    expect(writeEvents).toStrictEqual([
      expect.objectContaining({ 'realtime.broadcast_outcome': 'late' }),
    ]);
    expect(writeEvents[0]).not.toHaveProperty('realtime.broadcast_failure');
  });
});
