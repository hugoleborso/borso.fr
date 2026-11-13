import { describe, expect, it } from 'vitest';
import {
  buildDeckLineKey,
  type DeckLineEvent,
  listDeckLineEventsInReplayOrder,
  listValidDeckLineEvents,
  MAX_DECK_LINE_PLIES,
  MAX_OPENING_NAME_LENGTH,
  mergeDeckLineEvents,
  parseDeckLineEvent,
} from './deck-line-event.core';

const PHONE = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-13T12:00:00.000Z');

function buildEvent(overrides: Partial<DeckLineEvent> = {}): DeckLineEvent {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    kind: 'line-added',
    side: 'white',
    movesUci: ['e2e4', 'c7c5', 'b1c3'],
    openingName: 'Sicilian Defense: Closed',
    occurredAt: '2026-11-13T10:00:00.000Z',
    calendarDay: '2026-11-13',
    deviceId: PHONE,
    receivedAt: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('parseDeckLineEvent', () => {
  it('reads an added line and a removed line', () => {
    expect(parseDeckLineEvent(buildEvent())).toEqual(buildEvent());
    const removed = buildEvent({
      kind: 'line-removed',
      side: 'black',
      openingName: null,
      receivedAt: '2026-11-13T10:01:00.000Z',
    });
    expect(parseDeckLineEvent(removed)).toEqual(removed);
  });

  it('reads a promotion and the longest line allowed', () => {
    const promotion = buildEvent({ movesUci: ['a7a8q'] });
    expect(parseDeckLineEvent(promotion)).toEqual(promotion);
    const longest = buildEvent({
      movesUci: Array.from({ length: MAX_DECK_LINE_PLIES }, () => 'g1f3'),
    });
    expect(parseDeckLineEvent(longest)).toEqual(longest);
  });

  it('reads the longest opening name allowed', () => {
    const named = buildEvent({ openingName: 'x'.repeat(MAX_OPENING_NAME_LENGTH) });
    expect(parseDeckLineEvent(named)).toEqual(named);
  });

  it.each([
    ['a value that is not a record', null],
    ['an id that is not a UUID', buildEvent({ id: 'line-1' })],
    ['an unknown kind', { ...buildEvent(), kind: 'line-renamed' }],
    ['an unknown side', { ...buildEvent(), side: 'red' }],
    ['no move', buildEvent({ movesUci: [] })],
    ['moves that are not a list', { ...buildEvent(), movesUci: 'e2e4' }],
    ['a move in SAN', buildEvent({ movesUci: ['e4'] })],
    ['a move with a trailing square', buildEvent({ movesUci: ['e2e4e5'] })],
    ['a move with a leading letter', buildEvent({ movesUci: ['xe2e4'] })],
    [
      'a move that is not a string',
      { ...buildEvent(), movesUci: [{ toString: (): string => 'e2e4' }] },
    ],
    [
      'a line longer than allowed',
      buildEvent({ movesUci: Array.from({ length: MAX_DECK_LINE_PLIES + 1 }, () => 'g1f3') }),
    ],
    ['an empty opening name', buildEvent({ openingName: '' })],
    [
      'an opening name too long',
      buildEvent({ openingName: 'x'.repeat(MAX_OPENING_NAME_LENGTH + 1) }),
    ],
    ['an opening name that is not a string', { ...buildEvent(), openingName: 3 }],
    ['an instant that is not a date', buildEvent({ occurredAt: 'today' })],
    ['a calendar day that is not a day', buildEvent({ calendarDay: '2026-02-30' })],
    ['a device that is not a UUID', buildEvent({ deviceId: 'phone' })],
    ['a received instant that is not a date', buildEvent({ receivedAt: 'later' })],
  ])('refuses %s', (_reason, value) => {
    expect(parseDeckLineEvent(value)).toBeNull();
  });

  it('keeps the valid events of a list and drops the others', () => {
    expect(listValidDeckLineEvents([buildEvent(), { kind: 'line-added' }])).toEqual([buildEvent()]);
  });
});

describe('the deck line event log', () => {
  it('replays by the earliest instant, then by id', () => {
    const late = buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003' });
    const early = buildEvent({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004',
      occurredAt: '2026-11-13T11:00:00.000Z',
      calendarDay: '2026-11-13',
      receivedAt: '2026-11-13T09:00:00.000Z',
    });
    const tied = buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002' });
    expect(listDeckLineEventsInReplayOrder([late, early, tied], NOW)).toEqual([early, tied, late]);
  });

  it('merges two logs by id, keeping the stamped copy', () => {
    const stamped = buildEvent({ receivedAt: '2026-11-13T10:01:00.000Z' });
    expect(mergeDeckLineEvents([buildEvent()], [stamped])).toEqual([stamped]);
  });

  it('names a line by its side and its moves', () => {
    expect(buildDeckLineKey('black', ['e2e4', 'c7c5'])).toBe('black:e2e4 c7c5');
  });
});
