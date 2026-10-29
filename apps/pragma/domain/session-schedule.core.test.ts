import { describe, expect, it } from 'vitest';
import {
  bandDayOf,
  orderSessionsForListing,
  selectComingSessions,
  selectNextSession,
  selectPastSessions,
} from './session-schedule.core';

const NOW = new Date('2026-10-28T15:00:00.000Z');
const THIS_MORNING = { id: 'morning', date: '2026-10-28T08:00:00.000Z' };
const TONIGHT = { id: 'tonight', date: '2026-10-28T19:00:00.000Z' };
const TOMORROW = { id: 'tomorrow', date: '2026-10-29T18:00:00.000Z' };
const LAST_WEEK = { id: 'last-week', date: '2026-10-21T18:00:00.000Z' };
const YESTERDAY = { id: 'yesterday', date: new Date('2026-10-27T18:00:00.000Z') };

// @FollowsBlueprint test-pure-unit
describe('bandDayOf', () => {
  it('reads the calendar day in Paris, not in UTC', () => {
    expect(bandDayOf('2026-10-28T23:30:00.000Z')).toBe('2026-10-29');
    expect(bandDayOf(new Date('2026-10-28T22:59:00.000Z'))).toBe('2026-10-28');
  });
});

describe('selectNextSession', () => {
  it('keeps a session from earlier today as the next one until midnight', () => {
    expect(selectNextSession([TOMORROW, TONIGHT, THIS_MORNING, LAST_WEEK], NOW)).toBe(THIS_MORNING);
  });

  it('skips the sessions of past days', () => {
    expect(selectNextSession([LAST_WEEK, YESTERDAY, TOMORROW], NOW)).toBe(TOMORROW);
  });

  it('breaks a tie on the date by the identifier', () => {
    const twin = { id: 'a-twin', date: TOMORROW.date };
    expect(selectNextSession([TOMORROW, twin], NOW)).toBe(twin);
  });

  it('answers null when no session is ahead', () => {
    expect(selectNextSession([LAST_WEEK, YESTERDAY], NOW)).toBeNull();
    expect(selectNextSession([], NOW)).toBeNull();
  });

  it('turns over at midnight in Paris while it is still the same day in UTC', () => {
    const afterMidnightInParis = new Date('2026-10-28T23:30:00.000Z');
    expect(selectNextSession([TONIGHT, TOMORROW], afterMidnightInParis)).toBe(TOMORROW);
  });
});

describe('orderSessionsForListing', () => {
  it('lists coming sessions nearest first, then past ones newest first', () => {
    const ordered = orderSessionsForListing(
      [LAST_WEEK, TOMORROW, YESTERDAY, TONIGHT, THIS_MORNING],
      NOW,
    );
    expect(ordered.map((session) => session.id)).toEqual([
      'morning',
      'tonight',
      'tomorrow',
      'yesterday',
      'last-week',
    ]);
  });

  it('breaks ties on the identifier in both groups', () => {
    const pastTwin = { id: 'a-past', date: LAST_WEEK.date };
    const comingTwin = { id: 'a-coming', date: TOMORROW.date };
    const ordered = orderSessionsForListing([LAST_WEEK, TOMORROW, pastTwin, comingTwin], NOW);
    expect(ordered.map((session) => session.id)).toEqual([
      'a-coming',
      'tomorrow',
      'a-past',
      'last-week',
    ]);
  });
});

describe('selectComingSessions', () => {
  it('keeps the sessions of today and later, nearest first', () => {
    const coming = selectComingSessions(
      [LAST_WEEK, TOMORROW, YESTERDAY, TONIGHT, THIS_MORNING],
      NOW,
    );
    expect(coming.map((session) => session.id)).toEqual(['morning', 'tonight', 'tomorrow']);
  });
});

describe('selectPastSessions', () => {
  it('keeps the sessions of past days, newest first', () => {
    const past = selectPastSessions([LAST_WEEK, TOMORROW, YESTERDAY, TONIGHT, THIS_MORNING], NOW);
    expect(past.map((session) => session.id)).toEqual(['yesterday', 'last-week']);
  });
});
