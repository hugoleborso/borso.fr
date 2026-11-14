import type { CardId, ReviewEvent, ReviewOutcome } from '@domain/review-event.core';

export const PHONE = '11111111-1111-4111-8111-111111111111';
export const LAPTOP = '22222222-2222-4222-8222-222222222222';

const EVENT_ID_PAD_LENGTH = 12;

export function buildEventId(sequence: number): string {
  return `aaaaaaaa-aaaa-4aaa-8aaa-${String(sequence).padStart(EVENT_ID_PAD_LENGTH, '0')}`;
}

export function buildReviewEvent(
  sequence: number,
  cardId: CardId,
  reviewedAt: string,
  outcome: ReviewOutcome = 'recalled',
  overrides: Partial<ReviewEvent> = {},
): ReviewEvent {
  return {
    id: buildEventId(sequence),
    cardId,
    outcome,
    reviewedAt,
    calendarDay: reviewedAt.slice(0, 'YYYY-MM-DD'.length),
    deviceId: PHONE,
    receivedAt: null,
    ...overrides,
  };
}
