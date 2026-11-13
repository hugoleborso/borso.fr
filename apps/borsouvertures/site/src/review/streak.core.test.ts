import { describe, expect, it } from 'vitest';
import { buildReviewEvent } from './review.test-utils';
import { countStreakDays } from './streak.core';

const CARD_ID = 'move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';

function buildReviewOn(sequence: number, calendarDay: string) {
  return buildReviewEvent(sequence, CARD_ID, `${calendarDay}T08:00:00.000Z`);
}

// @FollowsBlueprint test-pure-unit
describe('countStreakDays', () => {
  it('is 0 when nothing was reviewed', () => {
    expect(countStreakDays([], '2026-03-10')).toBe(0);
  });

  it('counts the consecutive days holding a review, ending today', () => {
    const events = [
      buildReviewOn(1, '2026-03-08'),
      buildReviewOn(2, '2026-03-09'),
      buildReviewOn(3, '2026-03-10'),
      buildReviewOn(4, '2026-03-10'),
    ];
    expect(countStreakDays(events, '2026-03-10')).toBe(3);
  });

  it('keeps a streak that ended yesterday, because today is not over', () => {
    const events = [buildReviewOn(1, '2026-03-08'), buildReviewOn(2, '2026-03-09')];
    expect(countStreakDays(events, '2026-03-10')).toBe(2);
  });

  it('is 0 for a streak that ended two days ago', () => {
    const events = [buildReviewOn(1, '2026-03-07'), buildReviewOn(2, '2026-03-08')];
    expect(countStreakDays(events, '2026-03-10')).toBe(0);
  });

  it('stops at the first day with no review', () => {
    const events = [
      buildReviewOn(1, '2026-03-06'),
      buildReviewOn(2, '2026-03-08'),
      buildReviewOn(3, '2026-03-09'),
    ];
    expect(countStreakDays(events, '2026-03-09')).toBe(2);
  });

  it('crosses a month boundary', () => {
    const events = [buildReviewOn(1, '2026-02-28'), buildReviewOn(2, '2026-03-01')];
    expect(countStreakDays(events, '2026-03-01')).toBe(2);
  });

  it('reads the stamped day across a time-zone change, not the instant', () => {
    const inParis = buildReviewEvent(1, CARD_ID, '2026-03-09T22:30:00.000Z', 'recalled', {
      calendarDay: '2026-03-09',
    });
    const inTokyo = buildReviewEvent(2, CARD_ID, '2026-03-09T23:30:00.000Z', 'recalled', {
      calendarDay: '2026-03-10',
    });
    expect(countStreakDays([inParis, inTokyo], '2026-03-10')).toBe(2);
  });

  it('counts one day for two reviews more than a day apart that share a stamped day', () => {
    const inTokyo = buildReviewEvent(1, CARD_ID, '2026-03-09T16:00:00.000Z', 'recalled', {
      calendarDay: '2026-03-10',
    });
    const inLosAngeles = buildReviewEvent(2, CARD_ID, '2026-03-11T06:00:00.000Z', 'recalled', {
      calendarDay: '2026-03-10',
    });
    expect(countStreakDays([inTokyo, inLosAngeles], '2026-03-10')).toBe(1);
  });
});
