import type { ReviewEvent } from '@domain/review-event.core';
import { describe, expect, it } from 'vitest';
import {
  buildReviewEventRow,
  projectReviewEvent,
  type StoredReviewEvent,
} from './review-events.core';

const EVENT_ID = '7d3c1b2a-0000-4000-8000-000000000001';
const DEVICE_ID = '0f1e2d3c-0000-4000-8000-00000000d0d0';
const RECEIVED_AT = new Date('2026-11-13T10:00:00.000Z');
const CARD_ID = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';

function buildStoredEvent(id: string, outcome = 'recalled'): StoredReviewEvent {
  return {
    id,
    cardId: CARD_ID,
    outcome,
    reviewedAt: new Date('2026-11-13T09:59:00.000Z'),
    calendarDay: '2026-11-13',
    deviceId: DEVICE_ID,
    receivedAt: RECEIVED_AT,
  };
}

// @FollowsBlueprint test-pure-unit
describe('projectReviewEvent', () => {
  it('answers the shared review event with ISO instants', () => {
    expect(projectReviewEvent(buildStoredEvent(EVENT_ID))).toEqual({
      id: EVENT_ID,
      cardId: CARD_ID,
      outcome: 'recalled',
      reviewedAt: '2026-11-13T09:59:00.000Z',
      calendarDay: '2026-11-13',
      deviceId: DEVICE_ID,
      receivedAt: '2026-11-13T10:00:00.000Z',
    });
  });

  it('keeps a missed outcome', () => {
    expect(projectReviewEvent(buildStoredEvent(EVENT_ID, 'missed')).outcome).toBe('missed');
  });
});

describe('buildReviewEventRow', () => {
  it('stamps the server instant and ignores the receivedAt the device sent', () => {
    const event: ReviewEvent = {
      id: EVENT_ID,
      cardId: CARD_ID,
      outcome: 'recalled',
      reviewedAt: '2026-11-13T09:59:00.000Z',
      calendarDay: '2026-11-13',
      deviceId: DEVICE_ID,
      receivedAt: '2030-01-01T00:00:00.000Z',
    };
    expect(buildReviewEventRow(event, RECEIVED_AT)).toEqual(buildStoredEvent(EVENT_ID));
  });
});
