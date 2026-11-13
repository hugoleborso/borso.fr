import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  deckLineEventTable,
  pullDeckLineEventsQuerySchema,
  pushDeckLineEventsSchema,
} from './deck-line-events.schema';

const EVENT = {
  id: '7d3c1b2a-0000-4000-8000-000000000001',
  kind: 'line-added',
  side: 'white',
  movesUci: ['e2e4', 'c7c5', 'b1c3'],
  openingName: 'Sicilian Defense: Closed',
  occurredAt: '2026-11-13T09:59:00.000Z',
  calendarDay: '2026-11-13',
  deviceId: '0f1e2d3c-0000-4000-8000-00000000d0d0',
  receivedAt: null,
};

// @FollowsBlueprint test-pure-unit
describe('pushDeckLineEventsSchema', () => {
  it('reads a batch of deck line events', () => {
    expect(pushDeckLineEventsSchema.parse({ events: [EVENT] })).toEqual({ events: [EVENT] });
  });

  it('refuses a batch holding something that is not a deck line event', () => {
    const refusedBatch = pushDeckLineEventsSchema.safeParse({
      events: [{ ...EVENT, side: 'red' }],
    });
    expect(refusedBatch.success).toBe(false);
    expect(refusedBatch.error?.issues[0]?.message).toBe('not a deck line event');
  });

  it('accepts five hundred events and refuses five hundred and one', () => {
    expect(
      pushDeckLineEventsSchema.safeParse({ events: Array.from({ length: 500 }, () => EVENT) })
        .success,
    ).toBe(true);
    expect(
      pushDeckLineEventsSchema.safeParse({ events: Array.from({ length: 501 }, () => EVENT) })
        .success,
    ).toBe(false);
  });
});

describe('pullDeckLineEventsQuerySchema', () => {
  it('takes an optional cursor', () => {
    expect(pullDeckLineEventsQuerySchema.parse({})).toEqual({});
    expect(pullDeckLineEventsQuerySchema.parse({ after: 'resume~a~b' })).toEqual({
      after: 'resume~a~b',
    });
  });
});

describe('deckLineEventTable', () => {
  it('indexes received_at then id, the order a pull reads in', () => {
    const [receivedIndex] = getTableConfig(deckLineEventTable).indexes;
    expect(receivedIndex?.config.name).toBe('deck_line_event_received');
    expect(
      receivedIndex?.config.columns.map((column) => ('name' in column ? column.name : '')),
    ).toEqual(['received_at', 'id']);
  });
});
