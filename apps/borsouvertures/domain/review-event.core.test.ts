import { describe, expect, it } from 'vitest';
import {
  buildMoveCardId,
  listReviewEventsInReplayOrder,
  listValidReviewEvents,
  mergeReviewEvents,
  parseCardId,
  parseReviewEvent,
  REVIEW_EVENT_BATCH_LIMIT,
  type ReviewEvent,
  selectReplayInstant,
} from './review-event.core';

const POSITION_KEY = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const CARD_ID = `move:albin-countergambit:${POSITION_KEY}`;
const PHONE = '11111111-1111-4111-8111-111111111111';
const LAPTOP = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-02-01T12:00:00.000Z');

function disguise(text: string): { toString: () => string } {
  return { toString: () => text };
}

function buildEvent(overrides: Partial<ReviewEvent>): ReviewEvent {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    cardId: CARD_ID,
    outcome: 'recalled',
    reviewedAt: '2026-01-10T08:00:00.000Z',
    calendarDay: '2026-01-10',
    deviceId: PHONE,
    receivedAt: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('card ids', () => {
  it('builds a move card id from the deck and the position', () => {
    expect(buildMoveCardId('albin-countergambit', POSITION_KEY)).toBe(CARD_ID);
  });

  it('reads the three kinds back', () => {
    expect(parseCardId(CARD_ID)).toEqual({
      kind: 'move',
      deckId: 'albin-countergambit',
      subject: POSITION_KEY,
    });
    expect(parseCardId(`name:${POSITION_KEY}`)).toEqual({
      kind: 'name',
      deckId: null,
      subject: POSITION_KEY,
    });
    expect(parseCardId('trap:00sHx')).toEqual({ kind: 'trap', deckId: null, subject: '00sHx' });
  });

  it('refuses an unknown kind, a missing deck, and a subject that is no position key', () => {
    expect(parseCardId(`line:albin-countergambit:${POSITION_KEY}`)).toBeNull();
    expect(parseCardId(`move:${POSITION_KEY}`)).toBeNull();
    expect(parseCardId('move:albin-countergambit:somewhere')).toBeNull();
    expect(parseCardId('name:somewhere')).toBeNull();
    expect(parseCardId('trap:')).toBeNull();
    expect(parseCardId('')).toBeNull();
  });

  it('caps a batch at 500 events', () => {
    expect(REVIEW_EVENT_BATCH_LIMIT).toBe(500);
  });
});

describe('parseReviewEvent', () => {
  it('returns the event when every field holds', () => {
    const event = buildEvent({});
    expect(parseReviewEvent(structuredClone(event))).toEqual(event);
    const received = buildEvent({ receivedAt: '2026-01-10T08:00:05.000Z', outcome: 'missed' });
    expect(parseReviewEvent(structuredClone(received))).toEqual(received);
  });

  it('drops a field the type does not name', () => {
    expect(parseReviewEvent({ ...buildEvent({}), stability: 3 })).toEqual(buildEvent({}));
  });

  it.each([
    ['a value that is no record', 'text'],
    ['a null', null],
    ['a list', [buildEvent({})]],
    ['an id that is no UUID', { ...buildEvent({}), id: 'one' }],
    ['a missing id', { ...buildEvent({}), id: undefined }],
    ['an unknown card id', { ...buildEvent({}), cardId: 'move:nowhere' }],
    ['a card id that is no text', { ...buildEvent({}), cardId: 4 }],
    ['an unknown outcome', { ...buildEvent({}), outcome: 'wrong' }],
    ['an instant that is no date', { ...buildEvent({}), reviewedAt: 'yesterday' }],
    ['an instant that is no text', { ...buildEvent({}), reviewedAt: 17 }],
    ['a day that does not exist', { ...buildEvent({}), calendarDay: '2026-02-30' }],
    ['a day that is no text', { ...buildEvent({}), calendarDay: null }],
    ['a device id that is no UUID', { ...buildEvent({}), deviceId: 'phone' }],
    ['a server instant that is no date', { ...buildEvent({}), receivedAt: 'soon' }],
    ['a missing server instant', { ...buildEvent({}), receivedAt: undefined }],
  ])('refuses %s', (_label, value) => {
    expect(parseReviewEvent(value)).toBeNull();
  });
});

describe('parseReviewEvent, values that only look right once turned into text', () => {
  const event = buildEvent({});

  it.each([
    ['an id', { ...event, id: disguise(event.id) }],
    ['a card id', { ...event, cardId: disguise(event.cardId) }],
    ['an instant', { ...event, reviewedAt: disguise(event.reviewedAt) }],
    ['a day', { ...event, calendarDay: disguise(event.calendarDay) }],
    ['a device id', { ...event, deviceId: disguise(event.deviceId) }],
    ['a server instant', { ...event, receivedAt: disguise('2026-01-10T08:00:05.000Z') }],
  ])('refuses %s that is an object', (_label, value) => {
    expect(parseReviewEvent(value)).toBeNull();
  });

  it('refuses a function that carries the fields of an event', () => {
    expect(parseReviewEvent(Object.assign(() => undefined, event))).toBeNull();
  });
});

describe('listValidReviewEvents', () => {
  it('keeps the events that parse and drops the rest', () => {
    const event = buildEvent({});
    expect(listValidReviewEvents([event, { id: 'broken' }, null])).toEqual([event]);
  });
});

describe('selectReplayInstant', () => {
  it('uses the device instant when nothing is earlier', () => {
    expect(selectReplayInstant(buildEvent({}), NOW).toISOString()).toBe('2026-01-10T08:00:00.000Z');
  });

  it('clamps a reviewedAt in the future to now', () => {
    const fromTheFuture = buildEvent({ reviewedAt: '2027-01-01T00:00:00.000Z' });
    expect(selectReplayInstant(fromTheFuture, NOW)).toEqual(NOW);
  });

  it('uses the server instant when the device clock ran ahead of it', () => {
    const ahead = buildEvent({
      reviewedAt: '2026-01-12T08:00:00.000Z',
      receivedAt: '2026-01-10T09:00:00.000Z',
    });
    expect(selectReplayInstant(ahead, NOW).toISOString()).toBe('2026-01-10T09:00:00.000Z');
  });

  it('keeps the device instant when the server received the event later', () => {
    const pushedLater = buildEvent({ receivedAt: '2026-01-11T09:00:00.000Z' });
    expect(selectReplayInstant(pushedLater, NOW).toISOString()).toBe('2026-01-10T08:00:00.000Z');
  });
});

describe('listReviewEventsInReplayOrder', () => {
  it('orders by replay instant', () => {
    const later = buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' });
    const earlier = buildEvent({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      reviewedAt: '2026-01-09T08:00:00.000Z',
    });
    expect(listReviewEventsInReplayOrder([later, earlier], NOW)).toEqual([earlier, later]);
  });

  it('orders two events at one instant by id', () => {
    const second = buildEvent({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
    const first = buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    expect(listReviewEventsInReplayOrder([second, first], NOW)).toEqual([first, second]);
    expect(listReviewEventsInReplayOrder([first, second], NOW)).toEqual([first, second]);
  });

  it('leaves the list it was given untouched', () => {
    const events = [
      buildEvent({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
      buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    ];
    const before = structuredClone(events);
    listReviewEventsInReplayOrder(events, NOW);
    expect(events).toEqual(before);
  });
});

describe('mergeReviewEvents', () => {
  const fromPhone = buildEvent({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', deviceId: PHONE });
  const fromLaptop = buildEvent({
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    deviceId: LAPTOP,
    reviewedAt: '2026-01-10T07:00:00.000Z',
    receivedAt: '2026-01-10T07:00:03.000Z',
  });

  it('keeps the events of both devices', () => {
    expect(mergeReviewEvents([fromPhone], [fromLaptop])).toEqual([fromPhone, fromLaptop]);
  });

  it('gives one replay order whichever device arrives first', () => {
    const phoneFirst = listReviewEventsInReplayOrder(
      mergeReviewEvents([fromPhone], [fromLaptop]),
      NOW,
    );
    const laptopFirst = listReviewEventsInReplayOrder(
      mergeReviewEvents([fromLaptop], [fromPhone]),
      NOW,
    );
    expect(phoneFirst).toEqual(laptopFirst);
    expect(phoneFirst).toEqual([fromLaptop, fromPhone]);
  });

  it('keeps one copy of an id, and the copy the server stamped wins', () => {
    const stamped = { ...fromPhone, receivedAt: '2026-01-10T08:00:09.000Z' };
    expect(mergeReviewEvents([fromPhone], [stamped])).toEqual([stamped]);
    expect(mergeReviewEvents([stamped], [fromPhone])).toEqual([stamped]);
  });

  it('keeps the first copy when both are stamped', () => {
    const stamped = { ...fromPhone, receivedAt: '2026-01-10T08:00:09.000Z' };
    const stampedLater = { ...fromPhone, receivedAt: '2026-01-10T08:00:20.000Z' };
    expect(mergeReviewEvents([stamped], [stampedLater])).toEqual([stamped]);
  });

  it('keeps the first copy when neither is stamped', () => {
    const copy = { ...fromPhone, outcome: 'missed' as const };
    expect(mergeReviewEvents([fromPhone], [copy])).toEqual([fromPhone]);
  });
});
