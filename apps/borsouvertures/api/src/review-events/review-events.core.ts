import type { ReviewEvent, ReviewOutcome } from '@domain/review-event.core';
import type { ReviewEventRow } from './review-events.schema';

export type StoredReviewEvent = Readonly<ReviewEventRow>;

function parseStoredOutcome(outcome: string): ReviewOutcome {
  return outcome === 'recalled' ? 'recalled' : 'missed';
}

// @FollowsBlueprint core-projection
export function projectReviewEvent(row: StoredReviewEvent): ReviewEvent {
  return {
    id: row.id,
    cardId: row.cardId,
    outcome: parseStoredOutcome(row.outcome),
    reviewedAt: row.reviewedAt.toISOString(),
    calendarDay: row.calendarDay,
    deviceId: row.deviceId,
    receivedAt: row.receivedAt.toISOString(),
  };
}

export function buildReviewEventRow(event: ReviewEvent, now: Date): StoredReviewEvent {
  return {
    id: event.id,
    cardId: event.cardId,
    outcome: event.outcome,
    reviewedAt: new Date(event.reviewedAt),
    calendarDay: event.calendarDay,
    deviceId: event.deviceId,
    receivedAt: now,
  };
}
