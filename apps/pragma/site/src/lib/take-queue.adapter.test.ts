import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryTakeQueueStorage,
  type DatabaseFactoryLike,
  openTakeQueueStorage,
  type QueuedTakeEntry,
  readBrowserTakeQueueStorage,
} from './take-queue.adapter';
import type { QueuedTake } from './take-queue.core';

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
};

const ENTRY: QueuedTakeEntry = { take: TAKE, audio: new Blob(['abc'], { type: 'audio/webm' }) };

interface FakeDatabaseOptions {
  readonly openError?: DOMException | null;
  readonly failOpen?: boolean;
  readonly writeError?: DOMException | null;
  readonly failWrite?: 'error' | 'abort' | null;
  readonly failRead?: boolean;
  readonly readError?: DOMException | null;
}

function later(callback: () => void): void {
  queueMicrotask(callback);
}

class FakeRequest<Result> extends EventTarget {
  error: DOMException | null = null;
  readonly result: Result;
  constructor(result: Result) {
    super();
    this.result = result;
  }
  settle(failure: { readonly isFailing: boolean; readonly error: DOMException | null }): void {
    if (failure.isFailing) {
      this.error = failure.error;
      this.dispatchEvent(new Event('error'));
      return;
    }
    this.dispatchEvent(new Event('success'));
  }
}

class FakeTransaction extends EventTarget {
  error: DOMException | null = null;
  readonly store: FakeObjectStore;
  constructor(store: FakeObjectStore) {
    super();
    this.store = store;
  }
  objectStore(): FakeObjectStore {
    return this.store;
  }
}

interface FakeObjectStore {
  put: (value: unknown) => unknown;
  delete: (key: string) => unknown;
  getAll: () => FakeRequest<unknown[]>;
}

function createFakeDatabase(options: FakeDatabaseOptions = {}) {
  const rows = new Map<string, unknown>();
  const createdStores: string[] = [];
  const openCalls: { name: string; version: number }[] = [];
  const transactions: string[] = [];

  const objectStore: FakeObjectStore = {
    put: (value) => {
      if (typeof value === 'object' && value !== null && 'id' in value) {
        rows.set(String(value.id), value);
      }
      return {};
    },
    delete: (key) => {
      rows.delete(key);
      return {};
    },
    getAll: () => {
      const request = new FakeRequest<unknown[]>([...rows.values()]);
      later(() =>
        request.settle({
          isFailing: options.failRead === true,
          error: options.readError ?? null,
        }),
      );
      return request;
    },
  };

  const database = {
    createObjectStore: (name: string, settings: { keyPath: string }) => {
      createdStores.push(`${name}:${settings.keyPath}`);
      return {};
    },
    transaction: (name: string, mode: IDBTransactionMode) => {
      transactions.push(`${name}:${mode}`);
      const transaction = new FakeTransaction(objectStore);
      later(() => {
        const failure = options.failWrite ?? null;
        if (failure === null) {
          transaction.dispatchEvent(new Event('complete'));
          return;
        }
        transaction.error = options.writeError ?? null;
        transaction.dispatchEvent(new Event(failure));
      });
      return transaction;
    },
  };

  const factory: DatabaseFactoryLike = {
    open: (name, version) => {
      openCalls.push({ name, version });
      const request = new FakeRequest(database);
      later(() => {
        if (options.failOpen !== true) request.dispatchEvent(new Event('upgradeneeded'));
        request.settle({ isFailing: options.failOpen === true, error: options.openError ?? null });
      });
      return request;
    },
  };

  return { factory, rows, createdStores, openCalls, transactions };
}

// @FollowsBlueprint test-pure-unit
describe('openTakeQueueStorage', () => {
  it('creates its store on first open and opens the database once', async () => {
    const fake = createFakeDatabase();
    const storage = openTakeQueueStorage(fake.factory);

    await storage.save(ENTRY);
    await storage.list();

    expect(fake.createdStores).toEqual(['queued-takes:id']);
    expect(fake.openCalls).toEqual([{ name: 'pragma-takes', version: 1 }]);
  });

  it('stores the take with its audio and reads it back', async () => {
    const fake = createFakeDatabase();
    const storage = openTakeQueueStorage(fake.factory);

    expect(await storage.save(ENTRY)).toEqual({ kind: 'queued' });
    const [read] = await storage.list();

    expect(read?.take).toEqual(TAKE);
    expect(read?.audio).toBeInstanceOf(Blob);
  });

  it('skips a stored record it cannot read rather than failing the whole queue', async () => {
    const fake = createFakeDatabase();
    fake.rows.set('broken', { id: 'broken' });
    const storage = openTakeQueueStorage(fake.factory);
    await storage.save(ENTRY);

    expect((await storage.list()).map((entry) => entry.take.id)).toEqual(['take-1']);
  });

  it('removes a take', async () => {
    const fake = createFakeDatabase();
    const storage = openTakeQueueStorage(fake.factory);
    await storage.save(ENTRY);
    await storage.remove('take-1');
    expect(await storage.list()).toEqual([]);
    expect(fake.transactions).toEqual([
      'queued-takes:readwrite',
      'queued-takes:readwrite',
      'queued-takes:readonly',
    ]);
  });

  it('answers quota-exceeded when the device is full', async () => {
    const full = new DOMException('full', 'QuotaExceededError');
    const fake = createFakeDatabase({ failWrite: 'abort', writeError: full });
    expect(await openTakeQueueStorage(fake.factory).save(ENTRY)).toEqual({
      kind: 'quota-exceeded',
      error: full,
    });
  });

  it('answers failed for any other refused write', async () => {
    const refusal = new DOMException('nope', 'InvalidStateError');
    const fake = createFakeDatabase({ failWrite: 'error', writeError: refusal });
    expect(await openTakeQueueStorage(fake.factory).save(ENTRY)).toEqual({
      kind: 'failed',
      error: refusal,
    });
  });

  it('answers failed with a generic error when the browser names none', async () => {
    const fake = createFakeDatabase({ failWrite: 'error' });
    const outcome = await openTakeQueueStorage(fake.factory).save(ENTRY);
    expect(outcome).toEqual({ kind: 'failed', error: new Error('indexeddb-write-failed') });
  });

  it('answers failed when the database cannot be opened', async () => {
    const openRefusal = new DOMException('blocked', 'UnknownError');
    const fake = createFakeDatabase({ failOpen: true, openError: openRefusal });
    expect(await openTakeQueueStorage(fake.factory).save(ENTRY)).toEqual({
      kind: 'failed',
      error: openRefusal,
    });
    const silent = createFakeDatabase({ failOpen: true });
    await expect(openTakeQueueStorage(silent.factory).list()).rejects.toThrow(
      'indexeddb-open-failed',
    );
  });

  it('rejects a read the browser refuses', async () => {
    const readRefusal = new DOMException('gone', 'NotFoundError');
    const named = createFakeDatabase({ failRead: true, readError: readRefusal });
    await expect(openTakeQueueStorage(named.factory).list()).rejects.toBe(readRefusal);
    const silent = createFakeDatabase({ failRead: true });
    await expect(openTakeQueueStorage(silent.factory).list()).rejects.toThrow(
      'indexeddb-read-failed',
    );
  });

  it('rejects a removal the browser refuses', async () => {
    const fake = createFakeDatabase({ failWrite: 'abort' });
    await expect(openTakeQueueStorage(fake.factory).remove('take-1')).rejects.toThrow(
      'indexeddb-write-failed',
    );
  });
});

describe('createMemoryTakeQueueStorage', () => {
  it('saves, lists and removes in memory', async () => {
    const storage = createMemoryTakeQueueStorage();
    expect(await storage.save(ENTRY)).toEqual({ kind: 'queued' });
    expect(await storage.list()).toEqual([ENTRY]);
    await storage.remove('take-1');
    expect(await storage.list()).toEqual([]);
  });
});

describe('readBrowserTakeQueueStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to memory where the browser has no IndexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const storage = readBrowserTakeQueueStorage();
    await storage.save(ENTRY);
    expect(await storage.list()).toEqual([ENTRY]);
  });

  it('opens IndexedDB where the browser has it', async () => {
    const fake = createFakeDatabase();
    vi.stubGlobal('indexedDB', fake.factory);
    await readBrowserTakeQueueStorage().list();
    expect(fake.openCalls).toHaveLength(1);
  });
});
