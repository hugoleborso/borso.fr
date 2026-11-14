import { DefaultScheduler } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { buildExampleDeck } from '@/decks/deck.test-utils';
import { buildReviewEvent } from './review.test-utils';
import { type Scheduler, SCHEDULER_CONFIGURATION } from './scheduler.core';
import { projectTrainerStatistics } from './trainer-statistics.core';

const deck = buildExampleDeck();
const [firstCard] = deck.cards;

if (firstCard === undefined) throw new Error('the example deck holds six cards');

const first = firstCard.cardId;
const PARIS_WINTER_OFFSET_MINUTES = 60;

const scheduler: Scheduler = await DefaultScheduler({
  ...SCHEDULER_CONFIGURATION,
  learningSteps: [],
  relearningSteps: [],
});

// @FollowsBlueprint test-pure-unit
describe('projectTrainerStatistics', () => {
  it('is a zero streak and empty shares before the first review', () => {
    const statistics = projectTrainerStatistics({
      decks: [deck],
      events: [],
      scheduler,
      now: new Date('2026-01-05T08:00:00.000Z'),
      utcOffsetMinutes: 0,
    });
    expect(statistics.streakDays).toBe(0);
    expect(statistics.recentRetention).toEqual([
      { deckId: deck.id, kind: 'empty', reviews: 0, recalled: 0, percent: 0 },
    ]);
    expect(statistics.accuracy).toEqual(statistics.recentRetention);
    expect(statistics.retentionWeeks).toHaveLength(1);
    expect(statistics.retentionWeeks[0]?.weeks.every((week) => week.kind === 'empty')).toBe(true);
  });

  it('projects the streak, the retention and the accuracy from one log, on the device day', () => {
    const events = [
      buildReviewEvent(1, first, '2026-01-01T08:00:00.000Z'),
      buildReviewEvent(2, first, '2026-01-04T08:00:00.000Z', 'missed'),
      buildReviewEvent(3, first, '2026-01-04T23:00:00.000Z', 'recalled', {
        calendarDay: '2026-01-05',
      }),
    ];
    const statistics = projectTrainerStatistics({
      decks: [deck],
      events,
      scheduler,
      now: new Date('2026-01-04T23:30:00.000Z'),
      utcOffsetMinutes: PARIS_WINTER_OFFSET_MINUTES,
    });
    expect(statistics.streakDays).toBe(2);
    expect(statistics.recentRetention).toEqual([
      { deckId: deck.id, kind: 'measured', reviews: 2, recalled: 1, percent: 50 },
    ]);
    expect(statistics.accuracy).toEqual([
      { deckId: deck.id, kind: 'measured', reviews: 3, recalled: 2, percent: 67 },
    ]);
    expect(statistics.retentionWeeks[0]?.weeks.slice(-2)).toEqual([
      { weekStart: '2025-12-29', kind: 'measured', reviews: 1, recalled: 0, percent: 0 },
      { weekStart: '2026-01-05', kind: 'measured', reviews: 1, recalled: 1, percent: 100 },
    ]);
  });
});
