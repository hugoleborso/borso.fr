import { useSyncExternalStore } from 'react';
import { mergeReviewEvents, type ReviewEvent } from '@domain/review-event.core';
import { createEventLogStore, type EventLog } from '@/lib/event-log.store';
import { listStoredReviewEvents, putStoredReviewEvents } from './review-event-store.adapter';

export type ReviewLog = EventLog<ReviewEvent>;

const reviewLog = createEventLogStore({
  list: listStoredReviewEvents,
  put: putStoredReviewEvents,
  merge: mergeReviewEvents,
});

export const readReviewLogRequest = reviewLog.readRequest;
export const appendReviewEvent = reviewLog.append;
export const mergeIntoReviewLog = reviewLog.mergeInto;
export const subscribeToReviewLog = reviewLog.subscribe;
export const readReviewLog = reviewLog.read;

// @FollowsBlueprint external-store-module
export function useReviewLog(): ReviewLog {
  return useSyncExternalStore(subscribeToReviewLog, readReviewLog);
}
