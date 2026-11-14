import { useSyncExternalStore } from 'react';
import { type DeckLineEvent, mergeDeckLineEvents } from '@domain/deck-line-event.core';
import { createEventLogStore, type EventLog } from '@/lib/event-log.store';
import { listStoredDeckLineEvents, putStoredDeckLineEvents } from './deck-line-event-store.adapter';

export type DeckLineLog = EventLog<DeckLineEvent>;

const deckLineLog = createEventLogStore({
  list: listStoredDeckLineEvents,
  put: putStoredDeckLineEvents,
  merge: mergeDeckLineEvents,
});

export const readDeckLineLogRequest = deckLineLog.readRequest;
export const appendDeckLineEvent = deckLineLog.append;
export const mergeIntoDeckLineLog = deckLineLog.mergeInto;
export const subscribeToDeckLineLog = deckLineLog.subscribe;
export const readDeckLineLog = deckLineLog.read;

// @FollowsBlueprint external-store-module
export function useDeckLineLog(): DeckLineLog {
  return useSyncExternalStore(subscribeToDeckLineLog, readDeckLineLog);
}
