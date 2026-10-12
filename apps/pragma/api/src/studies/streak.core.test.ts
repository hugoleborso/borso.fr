import { describe, expect, it } from 'vitest';
import { computeStreak } from './streak.core';

const TODAY = '2026-10-12';

// @FollowsBlueprint test-pure-unit
describe('streak.core', () => {
  it('is zero with the joker available on an empty log', () => {
    expect(computeStreak([], TODAY)).toEqual({
      days: 0,
      isTodayCounted: false,
      isJokerAvailable: true,
    });
  });

  it('counts an unbroken run ending today', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11', '2026-10-12'], TODAY)).toEqual({
      days: 3,
      isTodayCounted: true,
      isJokerAvailable: true,
    });
  });

  it('keeps a run ending yesterday alive while today is still open', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11'], TODAY)).toEqual({
      days: 2,
      isTodayCounted: false,
      isJokerAvailable: true,
    });
  });

  it('counts a study logged twice on one day once', () => {
    expect(computeStreak(['2026-10-12', '2026-10-12'], TODAY).days).toBe(1);
  });

  it('bridges one missed day and spends the joker', () => {
    expect(computeStreak(['2026-10-09', '2026-10-10', '2026-10-12'], TODAY)).toEqual({
      days: 3,
      isTodayCounted: true,
      isJokerAvailable: false,
    });
  });

  it('treats a missed yesterday as the joker while today is still open', () => {
    expect(computeStreak(['2026-10-09', '2026-10-10'], TODAY)).toEqual({
      days: 2,
      isTodayCounted: false,
      isJokerAvailable: false,
    });
  });

  it('ends the streak on a second missed day within seven days', () => {
    expect(
      computeStreak(
        ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-10', '2026-10-11', '2026-10-12'],
        TODAY,
      ),
    ).toEqual({ days: 4, isTodayCounted: true, isJokerAvailable: false });
  });

  it('bridges two missed days that are seven days apart', () => {
    const studied = [
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-12',
    ];
    expect(computeStreak(studied, TODAY)).toEqual({
      days: 13,
      isTodayCounted: true,
      isJokerAvailable: false,
    });
  });

  it('gives the joker back once the last forgiven day is seven days old', () => {
    const studied = [
      '2026-10-03',
      '2026-10-04',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
    ];
    expect(computeStreak(studied, TODAY)).toEqual({
      days: 9,
      isTodayCounted: true,
      isJokerAvailable: true,
    });
  });

  it('ends the streak on two missed days in a row', () => {
    expect(computeStreak(['2026-10-08', '2026-10-11', '2026-10-12'], TODAY)).toEqual({
      days: 2,
      isTodayCounted: true,
      isJokerAvailable: true,
    });
  });

  it('is zero when the last study is older than the joker can reach', () => {
    expect(computeStreak(['2026-10-09'], TODAY)).toEqual({
      days: 0,
      isTodayCounted: false,
      isJokerAvailable: true,
    });
  });
});
