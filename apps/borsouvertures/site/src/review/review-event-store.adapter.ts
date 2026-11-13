import { listValidReviewEvents, type ReviewEvent } from '@domain/review-event.core';
import {
  type EventStoreDefinition,
  type EventStoreOperation,
  listStoredEvents,
  putStoredEvents,
} from '@/lib/event-store.adapter';

export type ReviewEventStoreOperation = EventStoreOperation;

export class ReviewEventStoreUnavailableError extends Error {
  readonly tags: { operation: ReviewEventStoreOperation };

  constructor(operation: ReviewEventStoreOperation, cause: unknown) {
    super(`The browser store of review events failed to ${operation}.`, { cause });
    this.name = 'ReviewEventStoreUnavailableError';
    this.tags = { operation };
  }
}

const REVIEW_EVENT_STORE: EventStoreDefinition<ReviewEvent> = {
  databaseName: 'borsouvertures-review',
  storeName: 'review-event',
  listValid: listValidReviewEvents,
  buildError: (operation, cause) => new ReviewEventStoreUnavailableError(operation, cause),
};

// @FollowsBlueprint adapter-storage-keyed-by-record
export async function listStoredReviewEvents(
  factory: IDBFactory | undefined,
): Promise<ReviewEvent[]> {
  return await listStoredEvents(factory, REVIEW_EVENT_STORE);
}

export async function putStoredReviewEvents(
  factory: IDBFactory | undefined,
  events: readonly ReviewEvent[],
): Promise<void> {
  await putStoredEvents(factory, REVIEW_EVENT_STORE, events);
}
