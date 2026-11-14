import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  type EventStoreDefinition,
  listStoredEvents,
  putStoredEvents,
} from './event-store.adapter';

interface NotedEvent {
  id: string;
  note: string;
}

function isNotedEvent(value: unknown): value is NotedEvent {
  return typeof value === 'object' && value !== null && 'id' in value && 'note' in value;
}

const NOTES: EventStoreDefinition<NotedEvent> = {
  databaseName: 'notes',
  storeName: 'note',
  listValid: (values) => values.filter((value) => isNotedEvent(value)),
  buildError: (operation, cause) => new Error(`notes failed to ${operation}`, { cause }),
};

async function readFailure(operation: Promise<unknown>): Promise<unknown> {
  return operation.then(
    () => 'resolved',
    (error: unknown) => error,
  );
}

// @FollowsBlueprint test-pure-unit
describe('an event store', () => {
  it('puts events by id and lists the valid ones back', async () => {
    const factory = new IDBFactory();
    await putStoredEvents(factory, NOTES, [
      { id: 'b', note: 'second' },
      { id: 'a', note: 'first' },
    ]);
    await putStoredEvents(factory, NOTES, [{ id: 'a', note: 'replaced' }]);
    await expect(listStoredEvents(factory, NOTES)).resolves.toEqual([
      { id: 'a', note: 'replaced' },
      { id: 'b', note: 'second' },
    ]);
  });

  it('names its own error for each failed operation', async () => {
    const failure = await readFailure(listStoredEvents(undefined, NOTES));
    expect(failure).toMatchObject({ message: 'notes failed to open' });
  });
});
