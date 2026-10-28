import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryTakeQueueStorage,
  type QueuedTakeEntry,
  type TakeQueueStorage,
} from './take-queue.adapter';
import type { QueuedTake, TakeCreateBody } from './take-queue.core';
import {
  createTakeQueue,
  type TakeQueueSettings,
  type TakeQueueTransport,
  type TakeTransportResult,
} from './take-queue.store';

const NOW = Date.parse('2026-10-23T18:00:00.000Z');
const LATER = new Date(NOW + 10 * 60_000).toISOString();

const TAKE: QueuedTake = {
  id: 'take-1',
  songId: 'song-1',
  sessionId: null,
  recordedAt: '2026-10-23T17:00:00.000Z',
  durationSeconds: 137,
  contentType: 'audio/webm',
  byteLength: 3,
  source: 'live',
  upload: null,
  isUploaded: false,
  wasDeferred: false,
  hasFailed: false,
  isFromPracticeMode: false,
};

function entryOf(take: QueuedTake): QueuedTakeEntry {
  return { take, audio: new Blob(['abc'], { type: 'audio/webm' }) };
}

const OK_TRUE: TakeTransportResult<true> = { kind: 'ok', value: true };

interface CreatedTake {
  readonly id: string;
}

function createTransport(overrides: Partial<TakeQueueTransport<CreatedTake>> = {}) {
  const creates: TakeCreateBody[] = [];
  const puts: { url: string; file: File }[] = [];
  const transport: TakeQueueTransport<CreatedTake> = {
    sign: vi.fn((take: QueuedTake) =>
      Promise.resolve({
        kind: 'ok' as const,
        value: {
          uploadUrl: `https://bucket.test/${take.id}`,
          objectKey: `take/${take.songId}/${take.id}.webm`,
          expiresAt: LATER,
        },
      }),
    ),
    put: vi.fn((url: string, file: File) => {
      puts.push({ url, file });
      return Promise.resolve(OK_TRUE);
    }),
    create: vi.fn((body: TakeCreateBody) => {
      creates.push(body);
      return Promise.resolve({ kind: 'ok' as const, value: { id: body.id } });
    }),
    ...overrides,
  };
  return { transport, creates, puts };
}

function createSettings(
  transport: TakeQueueTransport<CreatedTake>,
  overrides: Partial<TakeQueueSettings<CreatedTake>> = {},
) {
  const settings: TakeQueueSettings<CreatedTake> = {
    storage: createMemoryTakeQueueStorage(),
    transport,
    onCreated: vi.fn(),
    onExhausted: vi.fn(),
    onRetry: vi.fn(),
    wait: vi.fn(() => Promise.resolve()),
    now: () => NOW,
    isOnline: () => true,
    ...overrides,
  };
  return settings;
}

function failing<TValue>(status: number | null): Promise<TakeTransportResult<TValue>> {
  return Promise.resolve({ kind: 'failed', status });
}

// @FollowsBlueprint test-pure-unit
describe('createTakeQueue', () => {
  it('signs, sends and creates a queued take, then forgets it', async () => {
    const { transport, creates, puts } = createTransport();
    const settings = createSettings(transport);
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(puts).toHaveLength(1);
    expect(puts[0]?.url).toBe('https://bucket.test/take-1');
    expect(puts[0]?.file.type).toBe('audio/webm');
    expect(creates).toEqual([
      {
        id: 'take-1',
        objectKey: 'take/song-1/take-1.webm',
        songId: 'song-1',
        sessionId: null,
        recordedAt: TAKE.recordedAt,
        durationSeconds: 137,
        contentType: 'audio/webm',
        source: 'live',
        queued: false,
        fromPracticeMode: false,
      },
    ]);
    expect(settings.onCreated).toHaveBeenCalledWith({ id: 'take-1' });
    expect(queue.read()).toEqual([]);
    expect(await settings.storage.list()).toEqual([]);
  });

  it('keeps every take on the device while the browser is offline', async () => {
    const { transport } = createTransport();
    const settings = createSettings(transport, { isOnline: () => false });
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(transport.sign).not.toHaveBeenCalled();
    expect(queue.read().map((entry) => entry.take.id)).toEqual(['take-1']);
  });

  it('retries a failed send after waiting, and says the take was queued', async () => {
    const put = vi
      .fn<TakeQueueTransport<CreatedTake>['put']>()
      .mockImplementationOnce(() => failing(null))
      .mockImplementation(() => Promise.resolve(OK_TRUE));
    const { transport, creates } = createTransport({ put });
    const settings = createSettings(transport);
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(settings.onRetry).toHaveBeenCalledWith({ stage: 'put', status: null });
    expect(settings.wait).toHaveBeenCalledWith(1_000);
    expect(creates[0]?.queued).toBe(true);
    expect(queue.read()).toEqual([]);
  });

  it('signs again when the storage refuses the signature', async () => {
    const put = vi
      .fn<TakeQueueTransport<CreatedTake>['put']>()
      .mockImplementationOnce(() => failing(403))
      .mockImplementation(() => Promise.resolve(OK_TRUE));
    const { transport } = createTransport({ put });
    const queue = createTakeQueue(createSettings(transport));

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(transport.sign).toHaveBeenCalledTimes(2);
    expect(queue.read()).toEqual([]);
  });

  it('signs again when the stored signature has expired', async () => {
    const { transport } = createTransport();
    const queue = createTakeQueue(createSettings(transport));
    const expired = {
      ...TAKE,
      upload: { uploadUrl: 'https://old', objectKey: 'take/song-1/take-1.webm', expiresAt: '' },
    };

    await queue.enqueue(entryOf(expired));
    await queue.drain();

    expect(transport.sign).toHaveBeenCalledTimes(1);
  });

  it('holds a take whose attempts are spent, for the next opening', async () => {
    const { transport } = createTransport({ create: () => failing(503) });
    const settings = createSettings(transport);
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    const [held] = queue.read();
    expect(held?.take.hasFailed).toBe(false);
    expect(held?.take.wasDeferred).toBe(true);
    expect(held?.take.isUploaded).toBe(true);
    expect(settings.onRetry).toHaveBeenCalledTimes(2);
    expect(settings.onExhausted).toHaveBeenCalledWith(
      { stage: 'create', status: 503 },
      expect.objectContaining({ hasFailed: false }),
    );
    const [stored] = await settings.storage.list();
    expect(stored?.take.isUploaded).toBe(true);
  });

  it('gives up on a refusal, keeps the take, and sends it again on request', async () => {
    const create = vi
      .fn<TakeQueueTransport<CreatedTake>['create']>()
      .mockImplementationOnce(() => failing(404))
      .mockImplementation((body) => Promise.resolve({ kind: 'ok', value: { id: body.id } }));
    const { transport } = createTransport({ create });
    const settings = createSettings(transport);
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(queue.read()[0]?.take.hasFailed).toBe(true);
    expect(settings.onExhausted).toHaveBeenCalledWith(
      { stage: 'create', status: 404 },
      expect.objectContaining({ id: 'take-1', hasFailed: true }),
    );

    await queue.drain();
    expect(create).toHaveBeenCalledTimes(1);

    await queue.retry('take-1');
    expect(create).toHaveBeenCalledTimes(2);
    expect(queue.read()).toEqual([]);
  });

  it('marks a take holding no audio as failed without sending anything', async () => {
    const { transport } = createTransport();
    const settings = createSettings(transport);
    const queue = createTakeQueue(settings);

    await queue.enqueue({ take: { ...TAKE, byteLength: 0 }, audio: new Blob([]) });
    await queue.drain();

    expect(transport.sign).not.toHaveBeenCalled();
    expect(transport.put).not.toHaveBeenCalled();
    expect(queue.read()[0]?.take.hasFailed).toBe(true);
    expect(settings.onExhausted).toHaveBeenCalledWith(
      { stage: 'queue', status: null },
      expect.objectContaining({ id: 'take-1', hasFailed: true }),
    );
    const [stored] = await settings.storage.list();
    expect(stored?.take.hasFailed).toBe(true);
  });

  it('ignores a retry for a take it does not hold', async () => {
    const { transport } = createTransport();
    const queue = createTakeQueue(createSettings(transport));
    await queue.retry('unknown');
    expect(transport.sign).not.toHaveBeenCalled();
  });

  it('does not queue a take the device could not store', async () => {
    const storage: TakeQueueStorage = {
      ...createMemoryTakeQueueStorage(),
      save: () => Promise.resolve({ kind: 'quota-exceeded', error: new Error('full') }),
    };
    const { transport } = createTransport();
    const queue = createTakeQueue(createSettings(transport, { storage }));

    expect((await queue.enqueue(entryOf(TAKE))).kind).toBe('quota-exceeded');
    expect(queue.read()).toEqual([]);
  });

  it('still forgets a created take whose stored copy cannot be removed', async () => {
    const storage: TakeQueueStorage = {
      ...createMemoryTakeQueueStorage(),
      remove: () => Promise.reject(new Error('gone')),
    };
    const { transport } = createTransport();
    const settings = createSettings(transport, { storage });
    const queue = createTakeQueue(settings);

    await queue.enqueue(entryOf(TAKE));
    await queue.drain();

    expect(queue.read()).toEqual([]);
    expect(settings.onCreated).toHaveBeenCalledTimes(1);
  });

  it('loads what an earlier visit left on the device, once', async () => {
    const storage = createMemoryTakeQueueStorage();
    await storage.save(entryOf(TAKE));
    const { transport } = createTransport();
    const queue = createTakeQueue(createSettings(transport, { storage, isOnline: () => false }));
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);

    await queue.load();
    await queue.load();

    expect(queue.read().map((entry) => entry.take.id)).toEqual(['take-1']);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await queue.load();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(queue.readOnServer()).toEqual([]);
  });

  it('shares one drain between callers and sends a take queued while it runs', async () => {
    const { transport } = createTransport();
    const queue = createTakeQueue(createSettings(transport, { isOnline: () => false }));
    await queue.enqueue(entryOf(TAKE));
    const online = createTakeQueue(createSettings(transport));
    await online.enqueue(entryOf({ ...TAKE, id: 'take-2' }));
    const first = online.drain();
    const second = online.drain();
    await online.enqueue(entryOf({ ...TAKE, id: 'take-3' }));

    expect(second).toBe(first);
    await first;
    expect(online.read()).toEqual([]);
    expect(transport.create).toHaveBeenCalledTimes(2);
  });
});
