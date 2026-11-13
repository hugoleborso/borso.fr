import { type DeckLineEvent, listValidDeckLineEvents } from '@domain/deck-line-event.core';
import {
  type EventStoreDefinition,
  type EventStoreOperation,
  listStoredEvents,
  putStoredEvents,
} from '@/lib/event-store.adapter';

export class DeckLineEventStoreUnavailableError extends Error {
  readonly tags: { operation: EventStoreOperation };

  constructor(operation: EventStoreOperation, cause: unknown) {
    super(`The browser store of deck line events failed to ${operation}.`, { cause });
    this.name = 'DeckLineEventStoreUnavailableError';
    this.tags = { operation };
  }
}

const DECK_LINE_EVENT_STORE: EventStoreDefinition<DeckLineEvent> = {
  databaseName: 'borsouvertures-personal-deck',
  storeName: 'deck-line-event',
  listValid: listValidDeckLineEvents,
  buildError: (operation, cause) => new DeckLineEventStoreUnavailableError(operation, cause),
};

// @FollowsBlueprint adapter-storage-keyed-by-record
export async function listStoredDeckLineEvents(
  factory: IDBFactory | undefined,
): Promise<DeckLineEvent[]> {
  return await listStoredEvents(factory, DECK_LINE_EVENT_STORE);
}

export async function putStoredDeckLineEvents(
  factory: IDBFactory | undefined,
  events: readonly DeckLineEvent[],
): Promise<void> {
  await putStoredEvents(factory, DECK_LINE_EVENT_STORE, events);
}
