import { listValidReviewEvents, type ReviewEvent } from '@domain/review-event.core';

const DATABASE_NAME = 'borsouvertures-review';
const DATABASE_VERSION = 1;
const STORE_NAME = 'review-event';
const KEY_PATH = 'id';

export type ReviewEventStoreOperation = 'open' | 'read' | 'write';

export class ReviewEventStoreUnavailableError extends Error {
  readonly tags: { operation: ReviewEventStoreOperation };

  constructor(operation: ReviewEventStoreOperation, cause: unknown) {
    super(`The browser store of review events failed to ${operation}.`, { cause });
    this.name = 'ReviewEventStoreUnavailableError';
    this.tags = { operation };
  }
}

function requestDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: KEY_PATH });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error('IndexedDB refused to open the database', { cause: request.error }));
    };
  });
}

async function openDatabase(factory: IDBFactory | undefined): Promise<IDBDatabase> {
  try {
    if (factory === undefined) throw new Error('This browser has no IndexedDB');
    return await requestDatabase(factory);
  } catch (error) {
    throw new ReviewEventStoreUnavailableError('open', error);
  }
}

function runTransaction<Value>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  startRequest: (store: IDBObjectStore) => IDBRequest<Value>,
): Promise<Value> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = startRequest(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => {
      resolve(request.result);
    };
    transaction.onabort = () => {
      reject(new Error('The IndexedDB transaction was aborted', { cause: transaction.error }));
    };
  });
}

async function runStoreOperation<Value>(
  factory: IDBFactory | undefined,
  operation: Exclude<ReviewEventStoreOperation, 'open'>,
  mode: IDBTransactionMode,
  startRequest: (store: IDBObjectStore) => IDBRequest<Value>,
): Promise<Value> {
  const database = await openDatabase(factory);
  try {
    return await runTransaction(database, mode, startRequest);
  } catch (error) {
    throw new ReviewEventStoreUnavailableError(operation, error);
  } finally {
    database.close();
  }
}

// @FollowsBlueprint adapter-storage-keyed-by-record
export async function listStoredReviewEvents(
  factory: IDBFactory | undefined,
): Promise<ReviewEvent[]> {
  const stored: unknown[] = await runStoreOperation(factory, 'read', 'readonly', (store) =>
    store.getAll(),
  );
  return listValidReviewEvents(stored);
}

export async function appendStoredReviewEvent(
  factory: IDBFactory | undefined,
  event: ReviewEvent,
): Promise<void> {
  await runStoreOperation(factory, 'write', 'readwrite', (store) => store.put(event));
}

export async function putStoredReviewEvents(
  factory: IDBFactory | undefined,
  events: readonly ReviewEvent[],
): Promise<void> {
  const [firstEvent, ...laterEvents] = events;
  if (firstEvent === undefined) return;
  await runStoreOperation(factory, 'write', 'readwrite', (store) =>
    laterEvents.reduce((_previousRequest, event) => store.put(event), store.put(firstEvent)),
  );
}
