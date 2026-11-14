import type { DeckLineEvent } from '@domain/deck-line-event.core';
import { describe, expect, it } from 'vitest';
import {
  buildDeckLineEventRow,
  projectDeckLineEvent,
  type StoredDeckLineEvent,
} from './deck-line-events.core';

const EVENT_ID = '7d3c1b2a-0000-4000-8000-000000000001';
const DEVICE_ID = '0f1e2d3c-0000-4000-8000-00000000d0d0';
const RECEIVED_AT = new Date('2026-11-13T10:00:00.000Z');

function buildStoredEvent(overrides: Partial<StoredDeckLineEvent> = {}): StoredDeckLineEvent {
  return {
    id: EVENT_ID,
    kind: 'line-added',
    side: 'white',
    movesUci: 'e2e4 c7c5 b1c3',
    openingName: 'Sicilian Defense: Closed',
    occurredAt: new Date('2026-11-13T09:59:00.000Z'),
    calendarDay: '2026-11-13',
    deviceId: DEVICE_ID,
    receivedAt: RECEIVED_AT,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('projectDeckLineEvent', () => {
  it('answers the shared deck line event with ISO instants and a list of moves', () => {
    expect(projectDeckLineEvent(buildStoredEvent())).toEqual({
      id: EVENT_ID,
      kind: 'line-added',
      side: 'white',
      movesUci: ['e2e4', 'c7c5', 'b1c3'],
      openingName: 'Sicilian Defense: Closed',
      occurredAt: '2026-11-13T09:59:00.000Z',
      calendarDay: '2026-11-13',
      deviceId: DEVICE_ID,
      receivedAt: '2026-11-13T10:00:00.000Z',
    });
  });

  it('keeps a removal, the black side and a line with no name', () => {
    const projected = projectDeckLineEvent(
      buildStoredEvent({ kind: 'line-removed', side: 'black', openingName: null }),
    );
    expect(projected).toMatchObject({ kind: 'line-removed', side: 'black', openingName: null });
  });
});

describe('buildDeckLineEventRow', () => {
  it('stamps the server instant and ignores the receivedAt the device sent', () => {
    const event: DeckLineEvent = {
      id: EVENT_ID,
      kind: 'line-added',
      side: 'white',
      movesUci: ['e2e4', 'c7c5', 'b1c3'],
      openingName: 'Sicilian Defense: Closed',
      occurredAt: '2026-11-13T09:59:00.000Z',
      calendarDay: '2026-11-13',
      deviceId: DEVICE_ID,
      receivedAt: '2030-01-01T00:00:00.000Z',
    };
    expect(buildDeckLineEventRow(event, RECEIVED_AT)).toEqual(buildStoredEvent());
  });
});
