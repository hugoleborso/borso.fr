import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  appendStoredReviewEvent,
  listStoredReviewEvents,
  ReviewEventStoreUnavailableError,
} from './review-event-store.adapter';
import { buildReviewEvent } from './review.test-utils';

const CARD = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const OTHER_CARD =
  'move:albin-countergambit:rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -';
const FIRST = buildReviewEvent(1, CARD, '2026-01-10T08:00:00.000Z');
const SECOND = buildReviewEvent(2, OTHER_CARD, '2026-01-10T08:01:00.000Z', 'missed');

function prepareDatabase(
  factory: IDBFactory,
  version: number,
  upgrade: (database: IDBDatabase) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.open('borsouvertures-review', version);
    request.onupgradeneeded = () => {
      upgrade(request.result);
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => {
      reject(new Error('the test could not prepare the database'));
    };
  });
}

async function readFailure(operation: Promise<unknown>): Promise<unknown> {
  return operation.then(
    () => 'resolved',
    (error: unknown) => error,
  );
}

// @FollowsBlueprint test-pure-unit
describe('the review event store', () => {
  it('lists nothing from a browser that has stored nothing', async () => {
    await expect(listStoredReviewEvents(new IDBFactory())).resolves.toEqual([]);
  });

  it('appends events and lists them back after a reopen', async () => {
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, SECOND);
    await appendStoredReviewEvent(factory, FIRST);
    await expect(listStoredReviewEvents(factory)).resolves.toEqual([FIRST, SECOND]);
  });

  it('keeps one copy of an event appended twice', async () => {
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, FIRST);
    await appendStoredReviewEvent(factory, { ...FIRST, receivedAt: '2026-01-10T08:00:09.000Z' });
    await expect(listStoredReviewEvents(factory)).resolves.toEqual([
      { ...FIRST, receivedAt: '2026-01-10T08:00:09.000Z' },
    ]);
  });

  it('uses one object store named review-event keyed by id', async () => {
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, FIRST);
    await prepareDatabase(factory, 1, () => {
      throw new Error('the adapter already created version 1');
    });
    const names = await new Promise<string[]>((resolve) => {
      const request = factory.open('borsouvertures-review', 1);
      request.onsuccess = () => {
        const store = request.result.transaction('review-event').objectStore('review-event');
        resolve([...request.result.objectStoreNames, String(store.keyPath)]);
        request.result.close();
      };
    });
    expect(names).toEqual(['review-event', 'id']);
  });

  it('closes its connection, so the database can be upgraded afterwards', async () => {
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, FIRST);
    await listStoredReviewEvents(factory);
    await expect(
      prepareDatabase(factory, 2, (database) => {
        database.createObjectStore('added-later');
      }),
    ).resolves.toBeUndefined();
  });

  it('drops a stored value that is no review event', async () => {
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, FIRST);
    await appendStoredReviewEvent(factory, { ...SECOND, cardId: 'nowhere' });
    await expect(listStoredReviewEvents(factory)).resolves.toEqual([FIRST]);
  });

  it('reports open as the failed operation when the browser has no IndexedDB', async () => {
    const failure = await readFailure(listStoredReviewEvents(undefined));
    expect(failure).toBeInstanceOf(ReviewEventStoreUnavailableError);
    expect(failure).toMatchObject({
      name: 'ReviewEventStoreUnavailableError',
      message: 'The browser store of review events failed to open.',
      tags: { operation: 'open' },
    });
    expect(failure).toHaveProperty('cause.message', 'This browser has no IndexedDB');
  });

  it('reports open when the browser refuses the database', async () => {
    const factory = new IDBFactory();
    await prepareDatabase(factory, 2, (database) => {
      database.createObjectStore('review-event', { keyPath: 'id' });
    });
    const failure = await readFailure(appendStoredReviewEvent(factory, FIRST));
    expect(failure).toMatchObject({ tags: { operation: 'open' } });
    expect(failure).toHaveProperty('cause.message', 'IndexedDB refused to open the database');
    expect(failure).toHaveProperty('cause.cause.name', 'VersionError');
  });

  it('reports read when the store cannot be read', async () => {
    const factory = new IDBFactory();
    await prepareDatabase(factory, 1, (database) => {
      database.createObjectStore('another-store');
    });
    const failure = await readFailure(listStoredReviewEvents(factory));
    expect(failure).toBeInstanceOf(ReviewEventStoreUnavailableError);
    expect(failure).toMatchObject({
      message: 'The browser store of review events failed to read.',
      tags: { operation: 'read' },
    });
    expect(failure).toHaveProperty('cause.name', 'NotFoundError');
  });

  it('reports write when the transaction aborts', async () => {
    const factory = new IDBFactory();
    await prepareDatabase(factory, 1, (database) => {
      database
        .createObjectStore('review-event', { keyPath: 'id' })
        .createIndex('one-event-per-card', 'cardId', { unique: true });
    });
    await appendStoredReviewEvent(factory, FIRST);
    const failure = await readFailure(
      appendStoredReviewEvent(factory, { ...SECOND, cardId: FIRST.cardId }),
    );
    expect(failure).toMatchObject({
      message: 'The browser store of review events failed to write.',
      tags: { operation: 'write' },
    });
    expect(failure).toHaveProperty('cause.message', 'The IndexedDB transaction was aborted');
    expect(failure).toHaveProperty('cause.cause.name', 'ConstraintError');
    await expect(listStoredReviewEvents(factory)).resolves.toEqual([FIRST]);
  });
});
