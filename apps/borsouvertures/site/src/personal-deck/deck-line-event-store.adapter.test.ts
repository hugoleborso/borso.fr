import type { DeckLineEvent } from '@domain/deck-line-event.core';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  DeckLineEventStoreUnavailableError,
  listStoredDeckLineEvents,
  putStoredDeckLineEvents,
} from './deck-line-event-store.adapter';

const ADDED: DeckLineEvent = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  kind: 'line-added',
  side: 'white',
  movesUci: ['e2e4', 'c7c5', 'b1c3'],
  openingName: 'Sicilian Defense: Closed',
  occurredAt: '2026-11-13T10:00:00.000Z',
  calendarDay: '2026-11-13',
  deviceId: '11111111-1111-4111-8111-111111111111',
  receivedAt: null,
};

async function readFailure(operation: Promise<unknown>): Promise<unknown> {
  return operation.then(
    () => 'resolved',
    (error: unknown) => error,
  );
}

function listStoreNames(factory: IDBFactory): Promise<string[]> {
  return new Promise((resolve) => {
    const request = factory.open('borsouvertures-personal-deck', 1);
    request.onsuccess = () => {
      resolve([...request.result.objectStoreNames]);
      request.result.close();
    };
  });
}

// @FollowsBlueprint test-pure-unit
describe('the deck line event store', () => {
  it('keeps the events in the store deck-line-event of its own database, and drops what is no event', async () => {
    const factory = new IDBFactory();
    await putStoredDeckLineEvents(factory, [ADDED]);
    await putStoredDeckLineEvents(factory, [{ ...ADDED, id: 'not-an-id' }]);
    await expect(listStoredDeckLineEvents(factory)).resolves.toEqual([ADDED]);
    await expect(listStoreNames(factory)).resolves.toEqual(['deck-line-event']);
  });

  it('reports the failed operation with its own error', async () => {
    const failure = await readFailure(listStoredDeckLineEvents(undefined));
    expect(failure).toBeInstanceOf(DeckLineEventStoreUnavailableError);
    expect(failure).toMatchObject({
      name: 'DeckLineEventStoreUnavailableError',
      message: 'The browser store of deck line events failed to open.',
      tags: { operation: 'open' },
    });
    expect(failure).toHaveProperty('cause.message', 'This browser has no IndexedDB');
  });
});
