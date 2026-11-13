import { DefaultScheduler } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { buildExampleDeck } from '@/decks/deck.test-utils';
import type { BuiltDeck } from '@/decks/deck.utils';
import {
  buildDailyPlan,
  countCardsDueOn,
  countCardsIntroducedOn,
  countNewCards,
  findDeckProgress,
  projectTrainerProgress,
  selectDeckSessionCardIds,
  selectSessionCardIds,
} from './daily-plan.core';
import { buildReviewEvent, LAPTOP } from './review.test-utils';
import { type CardState, type Scheduler, SCHEDULER_CONFIGURATION } from './scheduler.core';

const deck = buildExampleDeck();
const [first, second, third, fourth, fifth, sixth] = deck.cards.map((card) => card.cardId);
const PARIS_WINTER_OFFSET_MINUTES = 60;

if (
  first === undefined ||
  second === undefined ||
  third === undefined ||
  fourth === undefined ||
  fifth === undefined ||
  sixth === undefined
) {
  throw new Error('the example deck holds six cards');
}

function buildState(cardId: string, dueAt: string | null): [string, CardState] {
  return [cardId, { cardId, dueAt, stability: 2, difficulty: 2, lapses: 0 }];
}

const scheduler: Scheduler = await DefaultScheduler({
  ...SCHEDULER_CONFIGURATION,
  learningSteps: [],
  relearningSteps: [],
});

// @FollowsBlueprint test-pure-unit
describe('buildDailyPlan', () => {
  it('offers the first new cards in deck order, up to the limit, when nothing was reviewed', () => {
    expect(
      buildDailyPlan({
        cards: deck.cards,
        states: new Map(),
        events: [],
        today: '2026-01-10',
        utcOffsetMinutes: 0,
        newCardsPerDay: 4,
      }),
    ).toEqual({ day: '2026-01-10', dueCardIds: [], newCardIds: [first, second, third, fourth] });
  });

  it('offers no new card at a limit of 0 and every card at a limit of 30', () => {
    const input = {
      cards: deck.cards,
      states: new Map<string, CardState>(),
      events: [],
      today: '2026-01-10',
      utcOffsetMinutes: 0,
    };
    expect(buildDailyPlan({ ...input, newCardsPerDay: 0 }).newCardIds).toEqual([]);
    expect(buildDailyPlan({ ...input, newCardsPerDay: 30 }).newCardIds).toHaveLength(6);
  });

  it('puts due cards first, by due instant then by id, and leaves out a card due later', () => {
    const states = new Map([
      buildState(fourth, '2026-01-09T08:00:00.000Z'),
      buildState(second, '2026-01-10T07:00:00.000Z'),
      buildState(third, '2026-01-09T08:00:00.000Z'),
      buildState(first, '2026-01-11T00:00:00.000Z'),
      buildState(fifth, null),
    ]);
    const plan = buildDailyPlan({
      cards: deck.cards,
      states,
      events: [],
      today: '2026-01-10',
      utcOffsetMinutes: 0,
      newCardsPerDay: 10,
    });
    expect(plan.dueCardIds).toEqual([
      ...[third, fourth].toSorted((left, right) => left.localeCompare(right, 'en')),
      second,
    ]);
    expect(plan.newCardIds).toEqual([sixth]);
  });

  it('counts a card as due on the calendar day of the device, not at the instant', () => {
    const states = new Map([buildState(first, '2026-01-10T23:30:00.000Z')]);
    const input = { cards: deck.cards, states, events: [], newCardsPerDay: 0 };
    expect(
      buildDailyPlan({ ...input, today: '2026-01-10', utcOffsetMinutes: 0 }).dueCardIds,
    ).toEqual([first]);
    expect(
      buildDailyPlan({
        ...input,
        today: '2026-01-10',
        utcOffsetMinutes: PARIS_WINTER_OFFSET_MINUTES,
      }).dueCardIds,
    ).toEqual([]);
    expect(
      buildDailyPlan({
        ...input,
        today: '2026-01-11',
        utcOffsetMinutes: PARIS_WINTER_OFFSET_MINUTES,
      }).dueCardIds,
    ).toEqual([first]);
  });

  it('takes the cards introduced today off the limit', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-10T08:00:00.000Z'),
      buildReviewEvent(2, second, '2026-01-10T08:01:00.000Z'),
      buildReviewEvent(3, third, '2026-01-09T08:00:00.000Z'),
    ];
    const states = new Map([
      buildState(first, '2026-01-13T08:00:00.000Z'),
      buildState(second, '2026-01-13T08:00:00.000Z'),
      buildState(third, '2026-01-12T08:00:00.000Z'),
    ]);
    const input = { cards: deck.cards, states, events, today: '2026-01-10', utcOffsetMinutes: 0 };
    expect(buildDailyPlan({ ...input, newCardsPerDay: 3 }).newCardIds).toEqual([fourth]);
    expect(buildDailyPlan({ ...input, newCardsPerDay: 2 }).newCardIds).toEqual([]);
    expect(buildDailyPlan({ ...input, newCardsPerDay: 1 }).newCardIds).toEqual([]);
  });
});

describe('countCardsIntroducedOn', () => {
  it('counts a card on the day of its first review only, whichever device made it', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-10T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-09T08:00:00.000Z', 'recalled', { deviceId: LAPTOP }),
      buildReviewEvent(3, second, '2026-01-10T08:00:00.000Z'),
      buildReviewEvent(4, second, '2026-01-10T09:00:00.000Z'),
      buildReviewEvent(5, third, '2026-01-09T08:00:00.000Z'),
      buildReviewEvent(6, third, '2026-01-10T08:00:00.000Z'),
    ];
    expect(countCardsIntroducedOn(events, '2026-01-10')).toBe(1);
    expect(countCardsIntroducedOn(events, '2026-01-09')).toBe(2);
    expect(countCardsIntroducedOn(events, '2026-01-08')).toBe(0);
    expect(countCardsIntroducedOn([], '2026-01-10')).toBe(0);
  });
});

describe('countCardsDueOn', () => {
  it('counts the cards due on or before a day', () => {
    const states = new Map([
      buildState(first, '2026-01-10T08:00:00.000Z'),
      buildState(second, '2026-01-11T08:00:00.000Z'),
      buildState(third, '2026-01-12T08:00:00.000Z'),
    ]);
    expect(countCardsDueOn(deck.cards, states, '2026-01-11', 0)).toBe(2);
    expect(countCardsDueOn(deck.cards, states, '2026-01-09', 0)).toBe(0);
    expect(countCardsDueOn(deck.cards.slice(1), states, '2026-01-12', 0)).toBe(2);
  });
});

describe('selectDeckSessionCardIds', () => {
  const plan = { day: '2026-01-10', dueCardIds: [second, 'move:other:x'], newCardIds: [fifth] };

  it('takes the deck share of the plan, due cards first', () => {
    expect(selectDeckSessionCardIds(deck, plan, new Map())).toEqual([second, fifth]);
  });

  it('reviews the seen cards of the deck ahead when the plan holds none of its cards', () => {
    const emptyPlan = { day: '2026-01-10', dueCardIds: ['move:other:x'], newCardIds: [] };
    const states = new Map([
      buildState(third, '2026-02-01T08:00:00.000Z'),
      buildState(first, '2026-02-01T08:00:00.000Z'),
    ]);
    expect(selectDeckSessionCardIds(deck, emptyPlan, states)).toEqual([first, third]);
    expect(selectDeckSessionCardIds(deck, emptyPlan, new Map())).toEqual([]);
  });
});

describe('projectTrainerProgress', () => {
  const now = new Date('2026-01-10T12:00:00.000Z');

  it('starts a new reader on the first new cards of the first deck', () => {
    const progress = projectTrainerProgress({
      decks: [deck],
      events: [],
      scheduler,
      now,
      utcOffsetMinutes: 0,
      newCardsPerDay: 2,
    });
    expect(progress).toEqual({
      plan: { day: '2026-01-10', dueCardIds: [], newCardIds: [first, second] },
      sessionCardIds: [first, second],
      dueTomorrowCount: 0,
      deckProgress: [
        {
          deckId: 'albin-countergambit',
          cardCount: 6,
          dueCount: 0,
          newCount: 6,
          sessionCardIds: [first, second],
        },
      ],
    });
  });

  it('replays the log into due cards, tomorrow and the deck counts', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-07T08:00:00.000Z'),
      buildReviewEvent(2, second, '2026-01-10T08:00:00.000Z', 'missed'),
      buildReviewEvent(3, third, '2026-01-10T08:00:00.000Z'),
    ];
    const progress = projectTrainerProgress({
      decks: [deck],
      events,
      scheduler,
      now,
      utcOffsetMinutes: 0,
      newCardsPerDay: 3,
    });
    expect(progress.plan).toEqual({
      day: '2026-01-10',
      dueCardIds: [first],
      newCardIds: [fourth],
    });
    expect(progress.sessionCardIds).toEqual([first, fourth]);
    expect(progress.dueTomorrowCount).toBe(2);
    expect(progress.deckProgress[0]).toMatchObject({ dueCount: 1, newCount: 3, cardCount: 6 });
  });

  it('counts a due card for the deck that holds it and for no other', () => {
    const [otherCard] = deck.cards;
    if (otherCard === undefined) throw new Error('the example deck holds cards');
    const twin: BuiltDeck = {
      ...deck,
      id: 'vienna-game',
      cards: [
        { ...otherCard, cardId: 'move:vienna-game:8/8/8/8/8/8/8/K6k w - -', deckId: 'vienna-game' },
      ],
    };
    const progress = projectTrainerProgress({
      decks: [deck, twin],
      events: [
        buildReviewEvent(1, 'move:vienna-game:8/8/8/8/8/8/8/K6k w - -', '2026-01-01T08:00:00.000Z'),
      ],
      scheduler,
      now,
      utcOffsetMinutes: 0,
      newCardsPerDay: 0,
    });
    expect(progress.deckProgress.map((deckProgress) => deckProgress.dueCount)).toEqual([0, 1]);
    expect(progress.deckProgress.map((deckProgress) => deckProgress.newCount)).toEqual([6, 0]);
  });

  it('reads the day on the device', () => {
    const lateEvening = new Date('2026-01-10T23:30:00.000Z');
    const input = { decks: [deck], events: [], scheduler, now: lateEvening, newCardsPerDay: 1 };
    expect(projectTrainerProgress({ ...input, utcOffsetMinutes: 0 }).plan.day).toBe('2026-01-10');
    expect(
      projectTrainerProgress({ ...input, utcOffsetMinutes: PARIS_WINTER_OFFSET_MINUTES }).plan.day,
    ).toBe('2026-01-11');
  });

  it('ignores the events of a deck that is no longer loaded', () => {
    const progress = projectTrainerProgress({
      decks: [deck],
      events: [
        buildReviewEvent(
          1,
          'move:removed-deck:8/8/8/8/8/8/8/K6k w - -',
          '2026-01-01T08:00:00.000Z',
        ),
      ],
      scheduler,
      now,
      utcOffsetMinutes: 0,
      newCardsPerDay: 1,
    });
    expect(progress.plan.dueCardIds).toEqual([]);
    expect(progress.dueTomorrowCount).toBe(0);
  });
});

describe('session selection', () => {
  const otherDeck: BuiltDeck = { ...deck, id: 'vienna-game', cards: [] };
  const progress = {
    plan: { day: '2026-01-10', dueCardIds: [second], newCardIds: [fifth, sixth] },
    sessionCardIds: [second, fifth, sixth],
    dueTomorrowCount: 0,
    deckProgress: [
      { deckId: deck.id, cardCount: 6, dueCount: 1, newCount: 2, sessionCardIds: [second, fifth] },
      { deckId: otherDeck.id, cardCount: 0, dueCount: 0, newCount: 0, sessionCardIds: [] },
    ],
  };

  it('finds the progress of a deck, or nothing', () => {
    expect(findDeckProgress(progress, 'vienna-game')?.cardCount).toBe(0);
    expect(findDeckProgress(progress, 'gone')).toBeNull();
  });

  it('asks the whole plan from Today and the share of a deck from its page', () => {
    expect(selectSessionCardIds(progress, null)).toEqual([second, fifth, sixth]);
    expect(selectSessionCardIds(progress, deck.id)).toEqual([second, fifth]);
    expect(selectSessionCardIds(progress, 'gone')).toEqual([]);
  });

  it('counts the new cards among the cards asked', () => {
    expect(countNewCards(progress.plan, [second, fifth, sixth])).toBe(2);
    expect(countNewCards(progress.plan, [second])).toBe(0);
  });
});
