import { describe, expect, it } from 'vitest';
import { secondsLeftUntil, selectCountdownFillPercent } from './vote-countdown.utils';

const ROUND_SECONDS = 30;
const CLOSES_AT = 1_800_000_000_000;

describe('secondsLeftUntil', () => {
  it('counts a whole round at the instant it opened', () => {
    expect(secondsLeftUntil(CLOSES_AT, CLOSES_AT - 30_000)).toBe(30);
  });

  it('rounds a part second up, so the display reaches zero only at the close', () => {
    expect(secondsLeftUntil(CLOSES_AT, CLOSES_AT - 1_200)).toBe(2);
  });

  it('never counts below zero once the round has closed', () => {
    expect(secondsLeftUntil(CLOSES_AT, CLOSES_AT + 9_000)).toBe(0);
  });
});

describe('selectCountdownFillPercent', () => {
  it('is full at the start of the round', () => {
    expect(selectCountdownFillPercent(ROUND_SECONDS, ROUND_SECONDS)).toBe(100);
  });

  it('is empty at the close', () => {
    expect(selectCountdownFillPercent(0, ROUND_SECONDS)).toBe(0);
  });

  it('is half way through the middle of the round', () => {
    expect(selectCountdownFillPercent(15, ROUND_SECONDS)).toBe(50);
  });

  it('clamps a clock that ran ahead or behind rather than drawing outside the bar', () => {
    expect(selectCountdownFillPercent(-4, ROUND_SECONDS)).toBe(0);
    expect(selectCountdownFillPercent(ROUND_SECONDS + 10, ROUND_SECONDS)).toBe(100);
  });
});
