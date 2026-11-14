import type { SyncedEvent } from '@domain/synced-event.core';
import { reportTaggedError } from '@/observability/error-reporting.adapter';
import { readErrorTags } from '@/observability/error-reporting.core';

export type EventLogMerge = 'stored' | 'in-memory-only';

export interface EventLog<Event> {
  events: readonly Event[];
  isProgressKept: boolean;
}

export interface EventLogSource<Event> {
  readonly list: (factory: IDBFactory | undefined) => Promise<Event[]>;
  readonly put: (factory: IDBFactory | undefined, events: readonly Event[]) => Promise<void>;
  readonly merge: (local: readonly Event[], remote: readonly Event[]) => Event[];
}

export interface EventLogStore<Event> {
  readonly readRequest: () => Promise<void>;
  readonly append: (event: Event) => void;
  readonly mergeInto: (events: readonly Event[]) => Promise<EventLogMerge>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly read: () => EventLog<Event>;
}

function readFactory(): IDBFactory | undefined {
  return globalThis.indexedDB;
}

// @FollowsBlueprint external-store-module
export function createEventLogStore<Event extends SyncedEvent>(
  source: EventLogSource<Event>,
): EventLogStore<Event> {
  const store: { log: EventLog<Event>; pendingLoad: Promise<void> | undefined } = {
    log: { events: [], isProgressKept: true },
    pendingLoad: undefined,
  };
  const listeners = new Set<() => void>();

  function replaceLog(log: EventLog<Event>): void {
    store.log = log;
    for (const listener of listeners) listener();
  }

  function keepProgressInMemoryOnly(error: unknown): void {
    reportTaggedError(error, readErrorTags(error));
    replaceLog({ events: store.log.events, isProgressKept: false });
  }

  async function load(): Promise<void> {
    try {
      const stored = await source.list(readFactory());
      replaceLog({
        events: source.merge(stored, store.log.events),
        isProgressKept: store.log.isProgressKept,
      });
    } catch (error) {
      keepProgressInMemoryOnly(error);
    }
  }

  async function persist(events: readonly Event[]): Promise<EventLogMerge> {
    try {
      await source.put(readFactory(), events);
      return 'stored';
    } catch (error) {
      keepProgressInMemoryOnly(error);
      return 'in-memory-only';
    }
  }

  return {
    readRequest: () => {
      store.pendingLoad ??= load();
      return store.pendingLoad;
    },
    append: (event) => {
      replaceLog({
        events: [...store.log.events, event],
        isProgressKept: store.log.isProgressKept,
      });
      void persist([event]);
    },
    mergeInto: async (events) => {
      if (events.length === 0) return 'stored';
      replaceLog({
        events: source.merge(store.log.events, events),
        isProgressKept: store.log.isProgressKept,
      });
      return await persist(events);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: () => store.log,
  };
}
