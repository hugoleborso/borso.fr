/**
 * @DependsOnExternal browser-indexeddb
 * @Feature takes
 */

import { TAKE_CONTENT_TYPES, TAKE_SOURCES } from '@domain/take-upload.core';
import { z } from 'zod';
import { isQuotaExceededError, type QueuedTake } from './take-queue.core';

export interface QueuedTakeEntry {
  readonly take: QueuedTake;
  readonly audio: Blob;
}

export type TakeQueueWriteOutcome =
  | { readonly kind: 'queued' }
  | { readonly kind: 'quota-exceeded'; readonly error: unknown }
  | { readonly kind: 'failed'; readonly error: unknown };

export interface TakeQueueStorage {
  readonly list: () => Promise<QueuedTakeEntry[]>;
  readonly save: (entry: QueuedTakeEntry) => Promise<TakeQueueWriteOutcome>;
  readonly remove: (takeId: string) => Promise<void>;
}

interface RequestLike<Result> {
  readonly result: Result;
  readonly error: DOMException | null;
  addEventListener(type: 'success' | 'error', listener: () => void): void;
}

interface ObjectStoreLike {
  put(value: unknown): unknown;
  delete(key: string): unknown;
  getAll(): RequestLike<unknown[]>;
}

interface TransactionLike {
  readonly error: DOMException | null;
  objectStore(name: string): ObjectStoreLike;
  addEventListener(type: 'complete' | 'error' | 'abort', listener: () => void): void;
}

interface DatabaseLike {
  createObjectStore(name: string, options: { keyPath: string }): unknown;
  transaction(name: string, mode: IDBTransactionMode): TransactionLike;
}

interface OpenRequestLike extends RequestLike<DatabaseLike> {
  addEventListener(type: 'success' | 'error' | 'upgradeneeded', listener: () => void): void;
}

export interface DatabaseFactoryLike {
  open(name: string, version: number): OpenRequestLike;
}

const DATABASE_NAME = 'pragma-takes';
const DATABASE_VERSION = 1;
const STORE_NAME = 'queued-takes';
const KEY_PATH = 'id';

const storedTakeSchema = z.object({
  id: z.string(),
  songId: z.string(),
  sessionId: z.string().nullable(),
  recordedAt: z.string(),
  durationSeconds: z.number(),
  contentType: z.enum(TAKE_CONTENT_TYPES),
  byteLength: z.number(),
  source: z.enum(TAKE_SOURCES),
  upload: z
    .object({ uploadUrl: z.string(), objectKey: z.string(), expiresAt: z.string() })
    .nullable(),
  isUploaded: z.boolean(),
  wasDeferred: z.boolean(),
  hasFailed: z.boolean(),
  isFromPracticeMode: z.boolean().default(false),
  audio: z.instanceof(Blob),
});

function toStoredRecord(entry: QueuedTakeEntry): Record<string, unknown> {
  return { ...entry.take, audio: entry.audio };
}

function toEntry(record: unknown): QueuedTakeEntry[] {
  const storedTake = storedTakeSchema.safeParse(record);
  if (!storedTake.success) return [];
  const { audio, ...take } = storedTake.data;
  return [{ take, audio }];
}

function openDatabase(factory: DatabaseFactoryLike): Promise<DatabaseLike> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: KEY_PATH });
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () =>
      reject(request.error ?? new Error('indexeddb-open-failed')),
    );
  });
}

function awaitTransaction(transaction: TransactionLike): Promise<void> {
  return new Promise((resolve, reject) => {
    const fail = (): void => reject(transaction.error ?? new Error('indexeddb-write-failed'));
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('error', fail);
    transaction.addEventListener('abort', fail);
  });
}

function awaitRecords(request: RequestLike<unknown[]>): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () =>
      reject(request.error ?? new Error('indexeddb-read-failed')),
    );
  });
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export function openTakeQueueStorage(factory: DatabaseFactoryLike): TakeQueueStorage {
  let opened: Promise<DatabaseLike> | null = null;
  const database = (): Promise<DatabaseLike> => {
    opened ??= openDatabase(factory);
    return opened;
  };

  return {
    list: async () => {
      const store = (await database()).transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const records = await awaitRecords(store.getAll());
      return records.flatMap(toEntry);
    },
    save: async (entry) => {
      try {
        const transaction = (await database()).transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(toStoredRecord(entry));
        await awaitTransaction(transaction);
        return { kind: 'queued' };
      } catch (error) {
        const isDeviceFull = isQuotaExceededError(error);
        return isDeviceFull ? { kind: 'quota-exceeded', error } : { kind: 'failed', error };
      }
    },
    remove: async (takeId) => {
      const transaction = (await database()).transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(takeId);
      await awaitTransaction(transaction);
    },
  };
}

export function createMemoryTakeQueueStorage(): TakeQueueStorage {
  const storedEntries = new Map<string, QueuedTakeEntry>();
  return {
    list: () => Promise.resolve([...storedEntries.values()]),
    save: (entry) => {
      storedEntries.set(entry.take.id, entry);
      return Promise.resolve({ kind: 'queued' });
    },
    remove: (takeId) => {
      storedEntries.delete(takeId);
      return Promise.resolve();
    },
  };
}

export function readBrowserTakeQueueStorage(): TakeQueueStorage {
  if (typeof indexedDB === 'undefined') return createMemoryTakeQueueStorage();
  return openTakeQueueStorage(indexedDB);
}
