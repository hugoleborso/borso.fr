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
const READ_INIT: RequestInit = { method: 'GET', credentials: 'include' };

function harness() {
  const sent: SentRequest[] = [];
  const closers: (() => void)[] = [];
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
    fetchResponse,
    reportBatchFailure: (failure) => failures.push(failure),
  });
  return {
    transport,
    sent,
    failures,
    read: (path: string, init: RequestInit = READ_INIT) =>
      transport.send(`${API_BASE}${path}`, init),
    closeTick: () => closers.splice(0).forEach((close) => close()),
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

describe('a caller that stops waiting', () => {
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
