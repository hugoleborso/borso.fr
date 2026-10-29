import { describe, expect, it } from 'vitest';
import { buildSetlistHeader } from './setlist-header.core';

const NOW = new Date('2026-10-28T10:00:00Z');
const PAST = { id: 'past', kind: 'practice', date: '2026-10-01T18:00:00Z', venue: null };
const OLDER = { id: 'older', kind: 'practice', date: '2026-09-01T18:00:00Z', venue: null };
const NEXT = { id: 'next', kind: 'concert', date: '2026-11-01T20:00:00Z', venue: 'Le Bar' };
const LATER = { id: 'later', kind: 'concert', date: '2026-12-01T20:00:00Z', venue: null };

describe('buildSetlistHeader', () => {
  it('goes back to the nearest coming session and totals the known durations', () => {
    const header = buildSetlistHeader({
      sessions: [LATER, PAST, NEXT],
      durationsInSeconds: [3000, null, 1680, undefined],
      now: NOW,
    });
    expect(header).toEqual({
      parentSession: NEXT,
      backTo: '/sessions/next',
      songCount: 4,
      total: { kind: 'hoursMinutes', hours: 1, minutes: '18' },
    });
  });

  it('goes back to the latest past session when none is ahead', () => {
    const header = buildSetlistHeader({
      sessions: [OLDER, PAST],
      durationsInSeconds: [],
      now: NOW,
    });
    expect(header.parentSession).toBe(PAST);
    expect(header.backTo).toBe('/sessions/past');
    expect(header.songCount).toBe(0);
    expect(header.total).toBeNull();
  });

  it('goes back to the setlist library when the setlist belongs to no session', () => {
    const header = buildSetlistHeader({ sessions: [], durationsInSeconds: [120], now: NOW });
    expect(header.parentSession).toBeNull();
    expect(header.backTo).toBe('/setlists');
    expect(header.total).toEqual({ kind: 'minutes', hours: 0, minutes: '2' });
  });
});
