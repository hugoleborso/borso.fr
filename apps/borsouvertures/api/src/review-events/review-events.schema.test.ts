import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  pullReviewEventsQuerySchema,
  pushReviewEventsSchema,
  reviewEventTable,
} from './review-events.schema';

const EVENT = {
  id: '7d3c1b2a-0000-4000-8000-000000000001',
  cardId: 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -',
  outcome: 'recalled',
  reviewedAt: '2026-11-13T09:59:00.000Z',
  calendarDay: '2026-11-13',
  deviceId: '0f1e2d3c-0000-4000-8000-00000000d0d0',
  receivedAt: null,
};

// @FollowsBlueprint test-pure-unit
describe('pushReviewEventsSchema', () => {
  it('reads a batch of review events', () => {
    expect(pushReviewEventsSchema.parse({ events: [EVENT] })).toEqual({ events: [EVENT] });
  });

  it('refuses a batch holding something that is not a review event', () => {
    const refusedBatch = pushReviewEventsSchema.safeParse({
      events: [{ ...EVENT, outcome: 'hard' }],
    });
    expect(refusedBatch.success).toBe(false);
    expect(refusedBatch.error?.issues[0]?.message).toBe('not a review event');
  });

  it('accepts five hundred events and refuses five hundred and one', () => {
    expect(
      pushReviewEventsSchema.safeParse({ events: Array.from({ length: 500 }, () => EVENT) })
        .success,
    ).toBe(true);
    expect(
      pushReviewEventsSchema.safeParse({ events: Array.from({ length: 501 }, () => EVENT) })
        .success,
    ).toBe(false);
  });
});

describe('pullReviewEventsQuerySchema', () => {
  it('takes an optional cursor', () => {
    expect(pullReviewEventsQuerySchema.parse({})).toEqual({});
    expect(pullReviewEventsQuerySchema.parse({ after: 'resume~a~b' })).toEqual({
      after: 'resume~a~b',
    });
  });
});

describe('reviewEventTable', () => {
  it('indexes received_at then id, the order a pull reads in', () => {
    const [receivedIndex] = getTableConfig(reviewEventTable).indexes;
    expect(receivedIndex?.config.name).toBe('review_event_received');
    expect(
      receivedIndex?.config.columns.map((column) => ('name' in column ? column.name : '')),
    ).toEqual(['received_at', 'id']);
  });
});
