import { describe, expect, it } from 'vitest';
import { STALE_BAR_DEFAULT_THRESHOLD_DAYS, countStale, isStale } from './stale-bar.utils';

const NOW = new Date('2026-05-20T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('isStale (front-end mirror)', () => {
  it('treats null lastInteractionAt as stale', () => {
    expect(isStale({ lastInteractionAt: null }, NOW)).toBe(true);
  });

  it('treats a malformed ISO string as stale', () => {
    expect(isStale({ lastInteractionAt: 'not a date' }, NOW)).toBe(true);
  });

  it('returns false for a recent touch', () => {
    const yesterdayIso = new Date(NOW.getTime() - 1 * DAY_MS).toISOString();
    expect(isStale({ lastInteractionAt: yesterdayIso }, NOW)).toBe(false);
  });

  it('returns false at the default threshold (60 days, inclusive)', () => {
    const exactly60 = new Date(NOW.getTime() - STALE_BAR_DEFAULT_THRESHOLD_DAYS * DAY_MS);
    expect(isStale({ lastInteractionAt: exactly60.toISOString() }, NOW)).toBe(false);
  });

  it('returns true past the default threshold (61 days)', () => {
    const sixtyOne = new Date(NOW.getTime() - 61 * DAY_MS);
    expect(isStale({ lastInteractionAt: sixtyOne.toISOString() }, NOW)).toBe(true);
  });

  it('honours a custom threshold', () => {
    const tenDaysIso = new Date(NOW.getTime() - 10 * DAY_MS).toISOString();
    expect(isStale({ lastInteractionAt: tenDaysIso }, NOW, 7)).toBe(true);
    expect(isStale({ lastInteractionAt: tenDaysIso }, NOW, 30)).toBe(false);
  });
});

describe('countStale (front-end mirror)', () => {
  it('returns 0 for an empty list', () => {
    expect(countStale([], NOW)).toBe(0);
  });

  it('counts each stale entry once', () => {
    const bars = [
      { lastInteractionAt: null },
      { lastInteractionAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString() },
      { lastInteractionAt: new Date(NOW.getTime() - 90 * DAY_MS).toISOString() },
    ];
    expect(countStale(bars, NOW)).toBe(2);
  });

  it('respects a custom threshold', () => {
    const bars = [{ lastInteractionAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString() }];
    expect(countStale(bars, NOW, 3)).toBe(1);
    expect(countStale(bars, NOW, 100)).toBe(0);
  });
});
