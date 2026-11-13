import type { ReviewEvent, ReviewOutcome } from '@domain/review-event.core';
import { DefaultScheduler } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { buildReviewEvent, LAPTOP } from './review.test-utils';
import { replayCardStates, type Scheduler, SCHEDULER_CONFIGURATION } from './scheduler.core';

const CARD = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const OTHER_CARD =
  'move:albin-countergambit:rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -';
const NOW = new Date('2026-06-01T00:00:00.000Z');
const GOLDEN_OUTCOMES: ReviewOutcome[] = ['recalled', 'recalled', 'missed', 'recalled', 'recalled'];
const GOLDEN_DUE_DATES = [
  '2026-01-04T08:00:00.000Z',
  '2026-01-18T08:00:00.000Z',
  '2026-01-20T08:00:00.000Z',
  '2026-01-25T08:00:00.000Z',
  '2026-02-07T08:00:00.000Z',
];

const scheduler: Scheduler = await DefaultScheduler({
  ...SCHEDULER_CONFIGURATION,
  learningSteps: [],
  relearningSteps: [],
});

function replayGoldenLog(reviewCount: number): ReviewEvent[] {
  const events: ReviewEvent[] = [];
  let reviewedAt = '2026-01-01T08:00:00.000Z';
  for (const [index, outcome] of GOLDEN_OUTCOMES.slice(0, reviewCount).entries()) {
    events.push(buildReviewEvent(index, CARD, reviewedAt, outcome));
    reviewedAt = replayCardStates(events, scheduler, NOW).get(CARD)?.dueAt ?? reviewedAt;
  }
  return events;
}

// @FollowsBlueprint test-pure-unit
describe('SCHEDULER_CONFIGURATION', () => {
  it('pins every option, with fuzz off', () => {
    expect(SCHEDULER_CONFIGURATION).toEqual({
      version: 'FSRS-6',
      desiredRetention: 0.9,
      maximumInterval: 365,
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
      enableFuzz: false,
    });
  });
});

describe('replayCardStates', () => {
  it('replays the golden log to the exact due dates', () => {
    const dueDates = GOLDEN_OUTCOMES.map(
      (_outcome, index) =>
        replayCardStates(replayGoldenLog(index + 1), scheduler, NOW).get(CARD)?.dueAt,
    );
    expect(dueDates).toEqual(GOLDEN_DUE_DATES);
  });

  it('gives the golden stability and difficulty after the first review', () => {
    expect(replayCardStates(replayGoldenLog(1), scheduler, NOW).get(CARD)).toEqual({
      cardId: CARD,
      dueAt: '2026-01-04T08:00:00.000Z',
      stability: 2.3065,
      difficulty: 2.118_103_97,
      lapses: 0,
    });
  });

  it('counts one lapse for the one missed review', () => {
    expect(replayCardStates(replayGoldenLog(5), scheduler, NOW).get(CARD)?.lapses).toBe(1);
    expect(replayCardStates(replayGoldenLog(2), scheduler, NOW).get(CARD)?.lapses).toBe(0);
  });

  it('gives equal maps when run twice', () => {
    const events = replayGoldenLog(5);
    expect(replayCardStates(events, scheduler, NOW)).toEqual(
      replayCardStates(events, scheduler, NOW),
    );
  });

  it('gives equal states whichever device arrives first', () => {
    const fromPhone = buildReviewEvent(1, CARD, '2026-01-01T08:00:00.000Z');
    const fromLaptop = buildReviewEvent(2, CARD, '2026-01-02T09:00:00.000Z', 'missed', {
      deviceId: LAPTOP,
    });
    const elsewhere = buildReviewEvent(3, OTHER_CARD, '2026-01-02T10:00:00.000Z');
    const phoneFirst = replayCardStates([fromPhone, fromLaptop, elsewhere], scheduler, NOW);
    const laptopFirst = replayCardStates([elsewhere, fromLaptop, fromPhone], scheduler, NOW);
    expect([...phoneFirst]).toEqual([...laptopFirst]);
    expect([...phoneFirst.keys()]).toEqual([CARD, OTHER_CARD]);
    expect(phoneFirst.get(CARD)?.lapses).toBe(1);
  });

  it('keeps one state per card and none for a card with no event', () => {
    const states = replayCardStates(
      [
        buildReviewEvent(1, CARD, '2026-01-01T08:00:00.000Z'),
        buildReviewEvent(2, OTHER_CARD, '2026-01-01T08:00:00.000Z', 'missed'),
      ],
      scheduler,
      NOW,
    );
    expect(states.size).toBe(2);
    expect(states.get(OTHER_CARD)?.dueAt).toBe('2026-01-02T08:00:00.000Z');
    expect(replayCardStates([], scheduler, NOW).size).toBe(0);
  });

  it('replays an event from the future at now', () => {
    const fromTheFuture = buildReviewEvent(1, CARD, '2027-01-01T08:00:00.000Z');
    const now = new Date('2026-01-01T08:00:00.000Z');
    expect(replayCardStates([fromTheFuture], scheduler, now).get(CARD)?.dueAt).toBe(
      '2026-01-04T08:00:00.000Z',
    );
  });
});
