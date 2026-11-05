import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReadTransport, type ReadBatchFailure } from './read-batch.adapter';

type FetchResponse = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface SentRequest {
  readonly input: RequestInfo | URL;
  readonly init: RequestInit | undefined;
  readonly answer: (response: Response) => void;
  readonly fail: (reason: unknown) => void;
}

const API_BASE = 'https://api.pragma.test';
const RETRY_SPREAD_MS = 6;
const READ_INIT: RequestInit = { method: 'GET', credentials: 'include' };

function harness() {
  const sent: SentRequest[] = [];
  const closers: (() => void)[] = [];
  const stragglerWaits: (() => void)[] = [];
  const failures: ReadBatchFailure[] = [];
  const fetchResponse = vi.fn<FetchResponse>(
    (input, init) =>
      new Promise<Response>((answer, fail) => {
        sent.push({ input, init, answer, fail });
      }),
  );
  const transport = createReadTransport({
    apiBase: API_BASE,
    closeGroup: (close) => closers.push(close),
    waitForStragglers: (release) => stragglerWaits.push(release),
    fetchResponse,
    reportBatchFailure: (failure) => failures.push(failure),
  });
  return {
    stragglerWaits,
    transport,
    sent,
    failures,
    read: (path: string, init: RequestInit = READ_INIT) =>
      transport.send(`${API_BASE}${path}`, init),
    closeTick: () => closers.splice(0).forEach((close) => close()),
    stopWaitingForStragglers: () => stragglerWaits.splice(0).forEach((release) => release()),
    request: (index: number): SentRequest => {
      const request = sent[index];
      if (request === undefined) throw new Error(`no request ${String(index)} left the tab`);
      return request;
    },
  };
}

function batchBody(request: SentRequest): unknown {
  return typeof request.init?.body === 'string' ? JSON.parse(request.init.body) : null;
}

function batchAnswer(...answers: readonly { status: number; body: string }[]): Response {
  return new Response(
    JSON.stringify({
      answers: answers.map((answer) => ({ ...answer, contentType: 'application/json' })),
    }),
    { status: 200 },
  );
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) {
    await Promise.resolve();
  }
}

const reads = (count: number) =>
  Array.from({ length: count }, (_, index) => `/api/songs/${String(index)}`);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// @FollowsBlueprint test-pure-unit
describe('the reads of one tick', () => {
  it('leave as one batch, and each caller gets its own answer', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');

    expect(tab.sent).toHaveLength(0);
    tab.closeTick();

    expect(tab.sent).toHaveLength(1);
    expect(tab.request(0).input).toBe(`${API_BASE}/api/read-batch`);
    expect(tab.request(0).init?.method).toBe('POST');
    expect(batchBody(tab.request(0))).toStrictEqual({
      reads: [
        { path: '/api/songs', headers: {} },
        { path: '/api/me', headers: {} },
      ],
    });
    tab
      .request(0)
      .answer(batchAnswer({ status: 200, body: '["song"]' }, { status: 401, body: '{}' }));

    const [songsResponse, profileResponse] = await Promise.all([songs, profile]);
    expect(await songsResponse.json()).toStrictEqual(['song']);
    expect(profileResponse.status).toBe(401);
    expect(tab.failures).toStrictEqual([]);
  });

  it('leave as a plain GET when the tick holds one read', async () => {
    const tab = harness();
    const init = { ...READ_INIT, headers: new Headers({ 'x-ballot-token': 'ballot-1' }) };
    const votes = tab.read('/api/audience/votes', init);
    tab.closeTick();

    expect(tab.request(0).input).toBe(`${API_BASE}/api/audience/votes`);
    expect(tab.request(0).init).toStrictEqual({
      credentials: 'include',
      headers: { 'x-ballot-token': 'ballot-1' },
    });
    tab.request(0).answer(new Response('{"votes":[]}', { status: 200 }));

    expect(await (await votes).json()).toStrictEqual({ votes: [] });
  });

  it('close a tick once, however many reads it holds', () => {
    const closers: (() => void)[] = [];
    const transport = createReadTransport({
      apiBase: API_BASE,
      closeGroup: (close) => closers.push(close),
      fetchResponse: () => new Promise<Response>(() => undefined),
      reportBatchFailure: () => undefined,
    });
    void transport.send(`${API_BASE}/api/songs`, READ_INIT);
    void transport.send(`${API_BASE}/api/me`, READ_INIT);

    expect(closers).toHaveLength(1);
  });

  it('send a read that came with no options', () => {
    const tab = harness();
    void tab.transport.send(`${API_BASE}/api/songs`);
    tab.closeTick();

    expect(tab.request(0).input).toBe(`${API_BASE}/api/songs`);
  });

  it('send a read asked twice once, and give each caller a body of its own', async () => {
    const tab = harness();
    const probe = tab.read('/api/instruments');
    const list = tab.read('/api/instruments');
    tab.closeTick();

    expect(tab.sent).toHaveLength(1);
    expect(tab.request(0).input).toBe(`${API_BASE}/api/instruments`);
    expect(tab.request(0).init).toStrictEqual({ credentials: 'include', headers: {} });
    tab.request(0).answer(
      new Response('{"instruments":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const [probeResponse, listResponse] = await Promise.all([probe, list]);
    expect(await probeResponse.json()).toStrictEqual({ instruments: [] });
    expect(await listResponse.json()).toStrictEqual({ instruments: [] });
    expect(listResponse.headers.get('content-type')).toBe('application/json');
  });

  it('fail both callers of a shared read when the network drops', async () => {
    const tab = harness();
    const probe = tab.read('/api/instruments');
    const list = tab.read('/api/instruments');
    tab.closeTick();
    const offline = new TypeError('Failed to fetch');
    tab.request(0).fail(offline);

    await expect(probe).rejects.toBe(offline);
    await expect(list).rejects.toBe(offline);
  });
});

describe('the two requests in flight', () => {
  it('hold a third group until one of the two answers', async () => {
    const tab = harness();
    void tab.read('/api/songs');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();
    const third = tab.read('/api/tasks');
    tab.closeTick();

    expect(tab.sent).toHaveLength(2);
    tab.request(1).answer(new Response('{}', { status: 200 }));
    await settle();

    expect(tab.sent).toHaveLength(3);
    expect(tab.request(2).input).toBe(`${API_BASE}/api/tasks`);
    tab.request(2).answer(new Response('[]', { status: 200 }));
    expect((await third).status).toBe(200);
  });

  it('free a slot when a lone read fails', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();
    void tab.read('/api/tasks');
    tab.closeTick();
    tab.request(0).fail(new TypeError('Failed to fetch'));

    await expect(songs).rejects.toThrow('Failed to fetch');
    await settle();
    expect(tab.sent).toHaveLength(3);
  });

  it('merge the groups that waited into one batch when a slot frees', async () => {
    const tab = harness();
    void tab.read('/api/songs');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();
    void tab.read('/api/tasks');
    void tab.read('/api/streaks');
    tab.closeTick();
    void tab.read('/api/members');
    tab.closeTick();

    expect(tab.sent).toHaveLength(2);
    tab.request(0).answer(new Response('{}', { status: 200 }));
    await settle();

    expect(tab.sent).toHaveLength(3);
    expect(batchBody(tab.request(2))).toStrictEqual({
      reads: [
        { path: '/api/tasks', headers: {} },
        { path: '/api/streaks', headers: {} },
        { path: '/api/members', headers: {} },
      ],
    });
  });

  it('send 23 reads of one live invalidation as 10, 10, then 3 once a slot frees', async () => {
    const tab = harness();
    const pending = reads(23).map((path) => tab.read(path));
    tab.closeTick();

    expect(tab.sent.map((request) => batchBody(request))).toStrictEqual([
      { reads: reads(10).map((path) => ({ path, headers: {} })) },
      {
        reads: reads(20)
          .slice(10)
          .map((path) => ({ path, headers: {} })),
      },
    ]);
    tab.request(0).answer(batchAnswer(...reads(10).map(() => ({ status: 200, body: '{}' }))));
    await settle();

    expect(tab.sent).toHaveLength(3);
    expect(batchBody(tab.request(2))).toStrictEqual({
      reads: reads(23)
        .slice(20)
        .map((path) => ({ path, headers: {} })),
    });
    expect((await pending[0])?.status).toBe(200);
  });

  it('let a write through at once, beside two reads in flight', () => {
    const tab = harness();
    void tab.read('/api/songs');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();
    const write = { method: 'POST', body: '{}' };
    void tab.transport.send(`${API_BASE}/api/tasks`, write);

    expect(tab.sent).toHaveLength(3);
    expect(tab.request(2).init).toBe(write);
  });

  it.each([
    ['a URL object', new URL(`${API_BASE}/api/songs`)],
    ['a path outside the API', `${API_BASE}/oauth/token`],
  ])('let %s through at once', (_, input) => {
    const tab = harness();
    void tab.transport.send(input, READ_INIT);

    expect(tab.request(0).input).toBe(input);
  });

  it('let a read with a header the batch cannot carry leave alone at once', () => {
    const tab = harness();
    const init = { headers: { accept: 'text/calendar' } };
    void tab.read('/api/calendar', init);

    expect(tab.request(0).init).toBe(init);
  });

  it('start over empty after a reset, and an answer from before the reset frees nothing', async () => {
    const tab = harness();
    void tab.read('/api/songs');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();
    void tab.read('/api/lost');
    tab.transport.reset();
    tab.closeTick();
    void tab.read('/api/tasks');
    tab.closeTick();
    void tab.read('/api/streaks');
    tab.closeTick();
    void tab.read('/api/members');
    tab.closeTick();

    expect(tab.sent.map((request) => request.input)).toStrictEqual([
      `${API_BASE}/api/songs`,
      `${API_BASE}/api/me`,
      `${API_BASE}/api/tasks`,
      `${API_BASE}/api/streaks`,
    ]);
    tab.request(0).answer(new Response('{}', { status: 200 }));
    await settle();
    expect(tab.sent).toHaveLength(4);
  });
});

describe('a batch that fails', () => {
  it('hands every caller the status of a refused batch, and reports it', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');
    tab.closeTick();
    tab.request(0).answer(
      new Response('{"message":"Service Unavailable"}', {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const responses = await Promise.all([songs, profile]);
    expect(responses.map((response) => response.status)).toStrictEqual([503, 503]);
    expect(await responses[1].json()).toStrictEqual({ message: 'Service Unavailable' });
    expect(tab.failures).toStrictEqual([{ status: 503, size: 2 }]);
  });

  it('rejects every caller when the network drops, and reports it', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');
    tab.closeTick();
    const offline = new TypeError('Failed to fetch');
    tab.request(0).fail(offline);

    await expect(songs).rejects.toBe(offline);
    await expect(profile).rejects.toBe(offline);
    expect(tab.failures).toStrictEqual([{ status: null, size: 2 }]);
  });

  it('rejects every caller when the answer is not JSON, and reports it', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');
    tab.closeTick();
    tab.request(0).answer(new Response('oops', { status: 200 }));

    await expect(songs).rejects.toThrow(SyntaxError);
    await expect(profile).rejects.toThrow(SyntaxError);
    expect(tab.failures).toStrictEqual([{ status: null, size: 2 }]);
  });

  it('rejects every caller when the answer holds one answer too few', async () => {
    const tab = harness();
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');
    tab.closeTick();
    tab.request(0).answer(new Response(JSON.stringify({ answers: [] }), { status: 200 }));

    await expect(songs).rejects.toThrow('read-batch-malformed');
    await expect(profile).rejects.toThrow('read-batch-malformed');
    expect(tab.failures).toStrictEqual([{ status: null, size: 2 }]);
  });
});

async function failBatchOf(paths: readonly string[], failure: 'refused' | 'dropped') {
  const tab = harness();
  const pending = paths.map((path) => tab.read(path));
  tab.closeTick();
  if (failure === 'refused') {
    tab.request(0).answer(new Response('{}', { status: 503 }));
  } else {
    tab.request(0).fail(new TypeError('Failed to fetch'));
  }
  await Promise.allSettled(pending);
  await settle();
  return tab;
}

describe('the reads of a failed batch, retried', () => {
  it.each(['refused', 'dropped'] as const)(
    'leave again as one batch when the batch was %s, though each retry comes in its own task',
    async (failure) => {
      const tab = await failBatchOf(['/api/songs', '/api/me', '/api/tasks'], failure);

      void tab.read('/api/songs');
      tab.closeTick();
      void tab.read('/api/me');
      tab.closeTick();
      expect(tab.sent).toHaveLength(1);
      void tab.read('/api/tasks');
      tab.closeTick();

      expect(tab.stragglerWaits).toHaveLength(1);
      expect(tab.sent).toHaveLength(2);
      expect(batchBody(tab.request(1))).toStrictEqual({
        reads: [
          { path: '/api/songs', headers: {} },
          { path: '/api/me', headers: {} },
          { path: '/api/tasks', headers: {} },
        ],
      });
    },
  );

  it('carry a read two callers shared once, with both callers in the retry', async () => {
    const tab = await failBatchOf(['/api/instruments', '/api/instruments', '/api/me'], 'refused');

    const probe = tab.read('/api/instruments');
    tab.closeTick();
    const list = tab.read('/api/instruments');
    tab.closeTick();
    void tab.read('/api/me');
    tab.closeTick();

    expect(batchBody(tab.request(1))).toStrictEqual({
      reads: [
        { path: '/api/instruments', headers: {} },
        { path: '/api/me', headers: {} },
      ],
    });
    tab.request(1).answer(batchAnswer({ status: 200, body: '[]' }, { status: 200, body: '{}' }));
    expect((await probe).status).toBe(200);
    expect((await list).status).toBe(200);
  });

  it('send the retries that came once the wait for the others is over', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');

    void tab.read('/api/songs');
    tab.closeTick();
    expect(tab.sent).toHaveLength(1);
    tab.stopWaitingForStragglers();
    tab.closeTick();

    expect(tab.request(1).input).toBe(`${API_BASE}/api/songs`);
  });

  it('send the retries and the fresh reads of one task as one batch', async () => {
    const tab = harness();
    const failed = [tab.read('/api/songs'), tab.read('/api/me')];
    tab.closeTick();
    const lone = tab.read('/api/tasks');
    tab.closeTick();
    tab.request(0).answer(new Response('{}', { status: 503 }));
    tab.request(1).fail(new TypeError('Failed to fetch'));
    await Promise.allSettled([...failed, lone]);
    await settle();

    void tab.read('/api/tasks');
    void tab.read('/api/songs');
    void tab.read('/api/me');
    tab.closeTick();

    expect(tab.sent).toHaveLength(3);
    expect(batchBody(tab.request(2))).toStrictEqual({
      reads: [
        { path: '/api/tasks', headers: {} },
        { path: '/api/songs', headers: {} },
        { path: '/api/me', headers: {} },
      ],
    });
  });

  it('let a fresh read close at the end of its own task while the retries gather', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');

    void tab.read('/api/songs');
    void tab.read('/api/streaks');
    tab.closeTick();

    expect(tab.request(1).input).toBe(`${API_BASE}/api/streaks`);
  });

  it('forget a failed read once its retry left', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');
    void tab.read('/api/songs');
    tab.stopWaitingForStragglers();
    tab.closeTick();

    void tab.read('/api/songs');
    tab.closeTick();

    expect(tab.stragglerWaits).toHaveLength(0);
    expect(tab.sent).toHaveLength(3);
  });

  it('forget the failed reads on a reset', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');
    tab.transport.reset();

    void tab.read('/api/songs');
    tab.closeTick();

    expect(tab.stragglerWaits).toHaveLength(0);
    expect(tab.request(1).input).toBe(`${API_BASE}/api/songs`);
  });

  it('gather a second retry with only its own reads, after a first retry failed too', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');
    const songs = tab.read('/api/songs');
    const profile = tab.read('/api/me');
    tab.closeTick();
    tab.request(1).answer(new Response('{}', { status: 503 }));
    await Promise.all([songs, profile]);
    await settle();

    void tab.read('/api/songs');
    tab.closeTick();
    expect(tab.sent).toHaveLength(2);
    void tab.read('/api/me');
    tab.closeTick();

    expect(batchBody(tab.request(2))).toStrictEqual({
      reads: [
        { path: '/api/songs', headers: {} },
        { path: '/api/me', headers: {} },
      ],
    });
  });

  it('gather the retries of a second failed batch on their own, though it shared a read with the first', async () => {
    const tab = harness();
    const firstBatch = [tab.read('/api/songs'), tab.read('/api/me')];
    tab.closeTick();
    const secondBatch = [tab.read('/api/songs'), tab.read('/api/tasks')];
    tab.closeTick();
    tab.request(0).answer(new Response('{}', { status: 503 }));
    tab.request(1).answer(new Response('{}', { status: 503 }));
    await Promise.all([...firstBatch, ...secondBatch]);
    await settle();

    void tab.read('/api/songs');
    void tab.read('/api/me');
    tab.closeTick();
    void tab.read('/api/songs');
    tab.closeTick();
    expect(tab.sent).toHaveLength(3);
    void tab.read('/api/tasks');
    tab.closeTick();

    expect(batchBody(tab.request(2))).toStrictEqual({
      reads: [
        { path: '/api/songs', headers: {} },
        { path: '/api/me', headers: {} },
      ],
    });
    expect(batchBody(tab.request(3))).toStrictEqual({
      reads: [
        { path: '/api/songs', headers: {} },
        { path: '/api/tasks', headers: {} },
      ],
    });
  });

  it('drop a retry that was gathering when the tab reset', async () => {
    const tab = await failBatchOf(['/api/songs', '/api/me'], 'refused');
    void tab.read('/api/songs');
    tab.transport.reset();
    tab.stopWaitingForStragglers();
    tab.closeTick();

    expect(tab.sent).toHaveLength(1);
  });

  it('send a read whose lone GET failed in the next ordinary group', async () => {
    const tab = await failBatchOf(['/api/songs'], 'refused');

    void tab.read('/api/songs');
    tab.closeTick();

    expect(tab.stragglerWaits).toHaveLength(0);
    expect(tab.request(1).input).toBe(`${API_BASE}/api/songs`);
  });
});

function listenTo(controller: AbortController): () => boolean | undefined {
  const listen = vi.spyOn(controller.signal, 'addEventListener');
  return () => {
    const options = listen.mock.calls[0]?.[2];
    return typeof options === 'object' ? options.signal?.aborted : undefined;
  };
}

describe('a caller that stops waiting', () => {
  it('stops listening to its signal once it has its answer', async () => {
    const tab = harness();
    const controller = new AbortController();
    const hasStoppedListening = listenTo(controller);
    const songs = tab.read('/api/songs', { signal: controller.signal });
    tab.closeTick();
    expect(hasStoppedListening()).toBe(false);
    tab.request(0).answer(new Response('[]', { status: 200 }));
    await songs;
    await settle();

    expect(hasStoppedListening()).toBe(true);
  });

  it('stops listening to its signal once its read failed', async () => {
    const tab = harness();
    const controller = new AbortController();
    const hasStoppedListening = listenTo(controller);
    const songs = tab.read('/api/songs', { signal: controller.signal });
    tab.closeTick();
    tab.request(0).fail(new TypeError('Failed to fetch'));
    await expect(songs).rejects.toThrow('Failed to fetch');
    await settle();

    expect(hasStoppedListening()).toBe(true);
  });

  it('rejects at once when its signal was already aborted, and sends nothing', async () => {
    const tab = harness();
    const controller = new AbortController();
    controller.abort('left the screen');

    await expect(tab.read('/api/songs', { signal: controller.signal })).rejects.toThrow(
      'left the screen',
    );
    tab.closeTick();
    expect(tab.sent).toHaveLength(0);
  });

  it('leaves the group before it leaves the tab', async () => {
    const tab = harness();
    const controller = new AbortController();
    const songs = tab.read('/api/songs', { signal: controller.signal });
    const profile = tab.read('/api/me');
    controller.abort('left the screen');
    tab.closeTick();

    await expect(songs).rejects.toThrow('left the screen');
    expect(tab.request(0).input).toBe(`${API_BASE}/api/me`);
    tab.request(0).answer(new Response('{}', { status: 200 }));
    expect((await profile).status).toBe(200);
  });

  it('rejects alone while its batch is in flight, and the others still get their answers', async () => {
    const tab = harness();
    const controller = new AbortController();
    const songs = tab.read('/api/songs', { signal: controller.signal });
    const profile = tab.read('/api/me');
    tab.closeTick();
    controller.abort('left the screen');
    tab.request(0).answer(batchAnswer({ status: 200, body: '[]' }, { status: 200, body: '{}' }));

    await expect(songs).rejects.toThrow('left the screen');
    expect((await profile).status).toBe(200);
  });
});

describe('the transport the client uses', () => {
  it('gathers the retries of a failed batch that come back a few milliseconds apart', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const sent: string[] = [];
    const platformFetch = vi.fn<FetchResponse>((input) => {
      sent.push(typeof input === 'string' ? input : 'not a path');
      return Promise.resolve(new Response('{}', { status: 503 }));
    });
    vi.stubGlobal('fetch', platformFetch);
    const transport = createReadTransport({ apiBase: '', reportBatchFailure: () => undefined });
    const failed = [transport.send('/api/songs', READ_INIT), transport.send('/api/me', READ_INIT)];
    await vi.runAllTimersAsync();
    await Promise.all(failed);

    setTimeout(() => void transport.send('/api/songs', READ_INIT));
    setTimeout(() => void transport.send('/api/me', READ_INIT), RETRY_SPREAD_MS);
    await vi.runAllTimersAsync();

    expect(sent).toStrictEqual(['/api/read-batch', '/api/read-batch']);
  });

  it('sends the retries that came once it stopped waiting for one that never comes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const sent: string[] = [];
    const platformFetch = vi.fn<FetchResponse>((input) => {
      sent.push(typeof input === 'string' ? input : 'not a path');
      return Promise.resolve(new Response('{}', { status: 503 }));
    });
    vi.stubGlobal('fetch', platformFetch);
    const transport = createReadTransport({ apiBase: '', reportBatchFailure: () => undefined });
    const failed = [transport.send('/api/songs', READ_INIT), transport.send('/api/me', READ_INIT)];
    await vi.runAllTimersAsync();
    await Promise.all(failed);

    void transport.send('/api/songs', READ_INIT);
    await vi.runAllTimersAsync();

    expect(sent).toStrictEqual(['/api/read-batch', '/api/songs']);
  });

  it('keeps a group open for a read issued a few promise turns later in the same task', async () => {
    const platformFetch = vi.fn<FetchResponse>(() =>
      Promise.resolve(batchAnswer({ status: 200, body: '1' }, { status: 200, body: '2' })),
    );
    vi.stubGlobal('fetch', platformFetch);
    const transport = createReadTransport({ apiBase: '', reportBatchFailure: () => undefined });

    const ticket = transport.send('/api/realtime/ticket', READ_INIT);
    await settle();
    const nextSession = transport.send('/api/sessions/next', READ_INIT);
    await Promise.all([ticket, nextSession]);

    expect(platformFetch).toHaveBeenCalledTimes(1);
    expect(platformFetch.mock.calls[0]?.[0]).toBe('/api/read-batch');
  });

  it('closes a group at the end of the task and reads the fetch of the moment', async () => {
    const platformFetch = vi.fn<FetchResponse>(() =>
      Promise.resolve(batchAnswer({ status: 200, body: '1' }, { status: 200, body: '2' })),
    );
    vi.stubGlobal('fetch', platformFetch);
    const transport = createReadTransport({ apiBase: '', reportBatchFailure: () => undefined });

    const answers = await Promise.all([
      transport.send('/api/songs', READ_INIT),
      transport.send('/api/me', READ_INIT),
    ]);

    expect(platformFetch).toHaveBeenCalledTimes(1);
    expect(platformFetch.mock.calls[0]?.[0]).toBe('/api/read-batch');
    expect(await Promise.all(answers.map((answer) => answer.json()))).toStrictEqual([1, 2]);
  });
});
