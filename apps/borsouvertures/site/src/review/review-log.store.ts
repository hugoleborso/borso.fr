import { useSyncExternalStore } from 'react';
import { mergeReviewEvents, type ReviewEvent } from '@domain/review-event.core';
import { reportTaggedError } from '@/observability/error-reporting.adapter';
import { readErrorTags } from '@/observability/error-reporting.core';
import {
  appendStoredReviewEvent,
  listStoredReviewEvents,
  putStoredReviewEvents,
} from './review-event-store.adapter';

export type ReviewLogMerge = 'stored' | 'in-memory-only';

export interface ReviewLog {
  events: readonly ReviewEvent[];
  isProgressKept: boolean;
}

const store: { log: ReviewLog; pendingLoad: Promise<void> | undefined } = {
  log: { events: [], isProgressKept: true },
  pendingLoad: undefined,
};
const listeners = new Set<() => void>();

function readFactory(): IDBFactory | undefined {
  return globalThis.indexedDB;
}

function replaceLog(log: ReviewLog): void {
  store.log = log;
  for (const listener of listeners) listener();
}

function keepProgressInMemoryOnly(error: unknown): void {
  reportTaggedError(error, readErrorTags(error));
  replaceLog({ events: store.log.events, isProgressKept: false });
}

async function loadReviewLog(): Promise<void> {
  try {
    const stored = await listStoredReviewEvents(readFactory());
    replaceLog({
      events: mergeReviewEvents(stored, store.log.events),
      isProgressKept: store.log.isProgressKept,
    });
  } catch (error) {
    keepProgressInMemoryOnly(error);
  }
}

async function persistReviewEvent(event: ReviewEvent): Promise<void> {
  try {
    await appendStoredReviewEvent(readFactory(), event);
  } catch (error) {
    keepProgressInMemoryOnly(error);
  }
}

export function readReviewLogRequest(): Promise<void> {
  store.pendingLoad ??= loadReviewLog();
  return store.pendingLoad;
}

export function appendReviewEvent(event: ReviewEvent): void {
  replaceLog({ events: [...store.log.events, event], isProgressKept: store.log.isProgressKept });
  void persistReviewEvent(event);
}

async function persistReviewEvents(events: readonly ReviewEvent[]): Promise<ReviewLogMerge> {
  try {
    await putStoredReviewEvents(readFactory(), events);
    return 'stored';
  } catch (error) {
    keepProgressInMemoryOnly(error);
    return 'in-memory-only';
  }
}

export async function mergeIntoReviewLog(events: readonly ReviewEvent[]): Promise<ReviewLogMerge> {
  if (events.length === 0) return 'stored';
  replaceLog({
    events: mergeReviewEvents(store.log.events, events),
    isProgressKept: store.log.isProgressKept,
  });
  return await persistReviewEvents(events);
}

export function subscribeToReviewLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readReviewLog(): ReviewLog {
  return store.log;
}

// @FollowsBlueprint external-store-module
export function useReviewLog(): ReviewLog {
  return useSyncExternalStore(subscribeToReviewLog, readReviewLog);
}
