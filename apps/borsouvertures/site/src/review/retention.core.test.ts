import { buildMoveCardId } from '@domain/review-event.core';
import { DefaultScheduler } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { Card } from '@/decks/card.core';
import { buildExampleDeck } from '@/decks/deck.test-utils';
import {
  buildRecallShare,
  type DeckReview,
  listDeckReviews,
  listDueReviews,
  projectDeckAccuracy,
  projectDeckRetention,
  projectRecentRetention,
  projectRetentionWeeks,
  RECENT_RETENTION_DAY_COUNT,
  RETENTION_WEEK_COUNT,
  selectWeekStart,
} from './retention.core';
import { buildReviewEvent } from './review.test-utils';
import { type Scheduler, SCHEDULER_CONFIGURATION } from './scheduler.core';

const ALBIN = 'albin-countergambit';
const VIENNA = 'vienna-game';
const deck = buildExampleDeck();
const [firstCard, secondCard] = deck.cards;

if (firstCard?.kind !== 'move' || secondCard === undefined) {
  throw new Error('the example deck opens on two move cards');
}

const first = firstCard.cardId;
const second = secondCard.cardId;
const viennaCard: Card = {
  ...firstCard,
  cardId: buildMoveCardId(VIENNA, firstCard.positionKey),
  deckId: VIENNA,
};
const cards: Card[] = [...deck.cards, viennaCard];
const NOW = new Date('2026-06-01T08:00:00.000Z');

const scheduler: Scheduler = await DefaultScheduler({
  ...SCHEDULER_CONFIGURATION,
  learningSteps: [],
  relearningSteps: [],
});

function buildDeckReview(
  deckId: string,
  calendarDay: string,
  outcome: DeckReview['outcome'] = 'recalled',
): DeckReview {
  return { deckId, calendarDay, outcome };
}

// @FollowsBlueprint test-pure-unit
describe('listDueReviews', () => {
  it('does not count the first review of a card', () => {
    const events = [buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z')];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([]);
  });

  it('counts each later review that found its card due, recalled or missed', () => {
    const events = [
      buildReviewEvent(3, first, '2026-01-18T08:00:00.000Z', 'missed'),
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-04T08:00:00.000Z'),
      buildReviewEvent(4, first, '2026-01-20T08:00:00.000Z'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-04'),
      buildDeckReview(ALBIN, '2026-01-18', 'missed'),
      buildDeckReview(ALBIN, '2026-01-20'),
    ]);
  });

  it('leaves retention unchanged for a review of a card that is not due', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-03T23:00:00.000Z'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([]);
  });

  it('counts a card as due on its calendar day, before the instant it was scheduled at', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-04T07:00:00.000Z'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-04'),
    ]);
  });

  it('reads the day each device stamped, so a review made further east is due sooner', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-03T23:30:00.000Z', 'recalled', {
        calendarDay: '2026-01-04',
      }),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-04'),
    ]);
  });

  it('ignores the second of two reviews of one card made the same day on two devices', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-04T08:00:00.000Z'),
      buildReviewEvent(3, first, '2026-01-04T09:00:00.000Z', 'missed'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-04'),
    ]);
  });

  it('measures the next review against the schedule a review ahead produced', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-02T08:00:00.000Z'),
      buildReviewEvent(3, first, '2026-01-04T08:00:00.000Z'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([]);
  });

  it('keeps each card on its own schedule and each review in its own deck', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, viennaCard.cardId, '2026-01-02T08:00:00.000Z'),
      buildReviewEvent(3, second, '2026-01-03T08:00:00.000Z'),
      buildReviewEvent(4, first, '2026-01-04T08:00:00.000Z'),
      buildReviewEvent(5, viennaCard.cardId, '2026-01-05T08:00:00.000Z', 'missed'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-04'),
      buildDeckReview(VIENNA, '2026-01-05', 'missed'),
    ]);
  });

  it('ignores a name card and a card whose deck file is gone', () => {
    const nameCardId = `name:${firstCard.positionKey}`;
    const goneCardId = buildMoveCardId('removed-deck', firstCard.positionKey);
    const events = [
      buildReviewEvent(1, nameCardId, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, nameCardId, '2026-01-04T08:00:00.000Z'),
      buildReviewEvent(3, goneCardId, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(4, goneCardId, '2026-01-04T08:00:00.000Z'),
    ];
    expect(listDueReviews(events, cards, scheduler, NOW)).toEqual([]);
    expect(listDeckReviews(events, cards, NOW)).toEqual([]);
  });
});

describe('listDeckReviews', () => {
  it('lists every stored review of a known card, due or not, the first one included', () => {
    const events = [
      buildReviewEvent(2, first, '2026-01-02T08:00:00.000Z', 'missed'),
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(3, viennaCard.cardId, '2026-01-03T08:00:00.000Z'),
    ];
    expect(listDeckReviews(events, cards, NOW)).toEqual([
      buildDeckReview(ALBIN, '2026-01-01'),
      buildDeckReview(ALBIN, '2026-01-02', 'missed'),
      buildDeckReview(VIENNA, '2026-01-03'),
    ]);
  });
});

describe('selectWeekStart', () => {
  it('is the Monday of the week the day falls in', () => {
    expect(selectWeekStart('2026-01-05')).toBe('2026-01-05');
    expect(selectWeekStart('2026-01-07')).toBe('2026-01-05');
    expect(selectWeekStart('2026-01-11')).toBe('2026-01-05');
    expect(selectWeekStart('2026-01-12')).toBe('2026-01-12');
    expect(selectWeekStart('2026-01-01')).toBe('2025-12-29');
  });
});

describe('buildRecallShare', () => {
  it('is empty, and not 0%, when nothing was reviewed', () => {
    expect(buildRecallShare(0, 0)).toEqual({ kind: 'empty', reviews: 0, recalled: 0, percent: 0 });
  });

  it('rounds the recalled share to a whole percent', () => {
    expect(buildRecallShare(3, 2)).toEqual({
      kind: 'measured',
      reviews: 3,
      recalled: 2,
      percent: 67,
    });
    expect(buildRecallShare(1, 0)).toEqual({
      kind: 'measured',
      reviews: 1,
      recalled: 0,
      percent: 0,
    });
    expect(buildRecallShare(4, 4).percent).toBe(100);
  });
});

describe('projectDeckRetention', () => {
  it('is empty when no due review was stored', () => {
    expect(projectDeckRetention([])).toEqual([]);
  });

  it('counts the due reviews and the recalled ones per deck and per week, in a stable order', () => {
    const dueReviews = [
      buildDeckReview(VIENNA, '2026-01-06'),
      buildDeckReview(ALBIN, '2026-01-14', 'missed'),
      buildDeckReview(ALBIN, '2026-01-05'),
      buildDeckReview(ALBIN, '2026-01-11', 'missed'),
      buildDeckReview(ALBIN, '2026-01-08'),
    ];
    expect(projectDeckRetention(dueReviews)).toEqual([
      { deckId: ALBIN, weekStart: '2026-01-05', dueReviews: 3, recalled: 2 },
      { deckId: ALBIN, weekStart: '2026-01-12', dueReviews: 1, recalled: 0 },
      { deckId: VIENNA, weekStart: '2026-01-05', dueReviews: 1, recalled: 1 },
    ]);
  });
});

describe('projectRecentRetention', () => {
  it('counts the due reviews of the last 30 days, today included, per deck', () => {
    const today = '2026-03-10';
    const dueReviews = [
      buildDeckReview(ALBIN, '2026-02-08'),
      buildDeckReview(ALBIN, '2026-02-09', 'missed'),
      buildDeckReview(ALBIN, '2026-03-10'),
      buildDeckReview(ALBIN, '2026-03-11'),
      buildDeckReview(VIENNA, '2026-01-01'),
    ];
    expect(RECENT_RETENTION_DAY_COUNT).toBe(30);
    expect(projectRecentRetention(dueReviews, [ALBIN, VIENNA], today)).toEqual([
      { deckId: ALBIN, kind: 'measured', reviews: 2, recalled: 1, percent: 50 },
      { deckId: VIENNA, kind: 'empty', reviews: 0, recalled: 0, percent: 0 },
    ]);
  });
});

describe('projectDeckAccuracy', () => {
  it('is the recalled share of all the reviews of each deck, in deck order', () => {
    const reviews = [
      buildDeckReview(ALBIN, '2026-01-01'),
      buildDeckReview(ALBIN, '2026-01-02', 'missed'),
      buildDeckReview(ALBIN, '2026-01-03'),
    ];
    expect(projectDeckAccuracy(reviews, [VIENNA, ALBIN])).toEqual([
      { deckId: VIENNA, kind: 'empty', reviews: 0, recalled: 0, percent: 0 },
      { deckId: ALBIN, kind: 'measured', reviews: 3, recalled: 2, percent: 67 },
    ]);
  });
});

describe('projectRetentionWeeks', () => {
  const today = '2026-03-25';
  const retention = [
    { deckId: ALBIN, weekStart: '2025-12-29', dueReviews: 9, recalled: 9 },
    { deckId: ALBIN, weekStart: '2026-01-05', dueReviews: 4, recalled: 3 },
    { deckId: ALBIN, weekStart: '2026-03-16', dueReviews: 2, recalled: 0 },
    { deckId: VIENNA, weekStart: '2026-03-23', dueReviews: 1, recalled: 1 },
  ];
  function projectBothDecks() {
    const [albin, vienna] = projectRetentionWeeks(retention, [ALBIN, VIENNA], today);
    return { albin, vienna };
  }

  it('gives each deck 12 weeks, oldest first, ending on the week of today', () => {
    const { albin, vienna } = projectBothDecks();
    expect(RETENTION_WEEK_COUNT).toBe(12);
    expect(albin?.deckId).toBe(ALBIN);
    expect(vienna?.deckId).toBe(VIENNA);
    expect(albin?.weeks.map((week) => week.weekStart)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
      '2026-02-23',
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
    ]);
  });

  it('renders a week with no due review as empty, and a week with none recalled as 0%', () => {
    const { albin } = projectBothDecks();
    expect(albin?.weeks.at(0)).toEqual({
      weekStart: '2026-01-05',
      kind: 'measured',
      reviews: 4,
      recalled: 3,
      percent: 75,
    });
    expect(albin?.weeks.at(1)).toEqual({
      weekStart: '2026-01-12',
      kind: 'empty',
      reviews: 0,
      recalled: 0,
      percent: 0,
    });
    expect(albin?.weeks.at(-2)).toEqual({
      weekStart: '2026-03-16',
      kind: 'measured',
      reviews: 2,
      recalled: 0,
      percent: 0,
    });
  });

  it('keeps each deck to its own weeks', () => {
    const { albin, vienna } = projectBothDecks();
    expect(albin?.weeks.at(-1)?.kind).toBe('empty');
    expect(vienna?.weeks.at(-1)).toEqual({
      weekStart: '2026-03-23',
      kind: 'measured',
      reviews: 1,
      recalled: 1,
      percent: 100,
    });
    expect(vienna?.weeks.filter((week) => week.kind === 'measured')).toHaveLength(1);
  });
});
