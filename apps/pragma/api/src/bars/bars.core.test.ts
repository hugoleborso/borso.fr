import { describe, expect, it } from 'vitest';
import { STALE_BAR_DEFAULT_THRESHOLD_DAYS, countStale, isStale } from './bars.core';

const NOW = new Date('2026-05-20T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('isStale', () => {
  it('treats null lastInteractionAt as stale (no interaction ever logged)', () => {
    expect(isStale({ lastInteractionAt: null }, NOW)).toBe(true);
  });

  it('returns false for a touch from yesterday', () => {
    const yesterday = new Date(NOW.getTime() - 1 * DAY_MS);
    expect(isStale({ lastInteractionAt: yesterday }, NOW)).toBe(false);
  });

  it('returns false exactly at the default threshold boundary (60 days, inclusive)', () => {
    const exactly60 = new Date(NOW.getTime() - STALE_BAR_DEFAULT_THRESHOLD_DAYS * DAY_MS);
    expect(isStale({ lastInteractionAt: exactly60 }, NOW)).toBe(false);
  });

  it('returns true past the default threshold (61 days)', () => {
    const sixtyOne = new Date(NOW.getTime() - 61 * DAY_MS);
    expect(isStale({ lastInteractionAt: sixtyOne }, NOW)).toBe(true);
  });

  it('honours a custom threshold (7 days)', () => {
    const eightDaysAgo = new Date(NOW.getTime() - 8 * DAY_MS);
    expect(isStale({ lastInteractionAt: eightDaysAgo }, NOW, 7)).toBe(true);
    expect(isStale({ lastInteractionAt: eightDaysAgo }, NOW, 30)).toBe(false);
  });
});

describe('countStale', () => {
  it('returns 0 for an empty list', () => {
    expect(countStale([], NOW)).toBe(0);
  });

  it('counts every stale bar (including null-touched ones)', () => {
    const bars = [
      { lastInteractionAt: null },
      { lastInteractionAt: new Date(NOW.getTime() - 5 * DAY_MS) },
      { lastInteractionAt: new Date(NOW.getTime() - 90 * DAY_MS) },
    ];
    expect(countStale(bars, NOW)).toBe(2);
  });

  it('respects a custom threshold', () => {
    const bars = [
      { lastInteractionAt: new Date(NOW.getTime() - 5 * DAY_MS) },
      { lastInteractionAt: new Date(NOW.getTime() - 90 * DAY_MS) },
    ];
    expect(countStale(bars, NOW, 3)).toBe(2);
    expect(countStale(bars, NOW, 100)).toBe(0);
  });
});
