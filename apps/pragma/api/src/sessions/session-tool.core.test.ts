import { describe, expect, it } from 'vitest';
import {
  matchSessionReference,
  projectSessionForTool,
  selectSessionsInWindow,
  summarizeSession,
  summarizeSessionsInWindow,
} from './session-tool.core';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const PAST_PRACTICE = {
  id: 'session-past',
  kind: 'practice',
  date: new Date('2026-10-20T18:00:00.000Z'),
  venue: null,
};
const NEXT_PRACTICE = {
  id: 'session-practice',
  kind: 'practice',
  date: new Date('2026-11-03T18:00:00.000Z'),
  venue: null,
};
const CONCERT = {
  id: 'session-concert',
  kind: 'concert',
  date: new Date('2026-11-07T20:00:00.000Z'),
  venue: 'Le Petit Bain',
};
const SAME_DAY_PRACTICE = {
  id: 'session-afternoon',
  kind: 'practice',
  date: new Date('2026-11-07T14:00:00.000Z'),
  venue: null,
};
const SESSIONS = [CONCERT, PAST_PRACTICE, NEXT_PRACTICE];

// @FollowsBlueprint test-pure-unit
describe('summarizeSession', () => {
  it('writes the date as an ISO string', () => {
    expect(summarizeSession(CONCERT)).toEqual({
      id: 'session-concert',
      kind: 'concert',
      date: '2026-11-07T20:00:00.000Z',
      venue: 'Le Petit Bain',
    });
  });
});

describe('projectSessionForTool', () => {
  const details = { preparedConcertId: null, capacity: 120, gear: 'Two monitors' };

  it('names the friends each member brings', () => {
    expect(
      projectSessionForTool(
        { ...CONCERT, ...details, friendsCountPerMember: { 'member-hugo': 3, 'member-gone': 1 } },
        [{ id: 'member-hugo', name: 'Hugo' }],
      ),
    ).toEqual({
      ...summarizeSession(CONCERT),
      capacity: 120,
      gear: 'Two monitors',
      preparedConcertId: null,
      friendsCountPerMember: { Hugo: 3, 'member-gone': 1 },
    });
  });

  it('answers no friends counts for a session without any', () => {
    expect(
      projectSessionForTool({ ...NEXT_PRACTICE, ...details, friendsCountPerMember: null }, [])
        .friendsCountPerMember,
    ).toBeNull();
    expect(
      projectSessionForTool({ ...NEXT_PRACTICE, ...details, friendsCountPerMember: 3 }, [])
        .friendsCountPerMember,
    ).toBeNull();
  });
});

describe('selectSessionsInWindow', () => {
  it('answers the sessions from now on, soonest first, a session starting now included', () => {
    const startingNow = { ...PAST_PRACTICE, id: 'session-now', date: NOW };
    expect(
      selectSessionsInWindow([...SESSIONS, startingNow], 'upcoming', NOW).map(({ id }) => id),
    ).toEqual(['session-now', 'session-practice', 'session-concert']);
  });

  it('answers the past sessions, latest first', () => {
    const older = { ...PAST_PRACTICE, id: 'session-older', date: new Date('2026-10-01') };
    expect(selectSessionsInWindow([...SESSIONS, older], 'past', NOW).map(({ id }) => id)).toEqual([
      'session-past',
      'session-older',
    ]);
  });

  it('answers every session in date order, breaking a tie on the id', () => {
    const twin = { ...NEXT_PRACTICE, id: 'session-a-twin' };
    expect(selectSessionsInWindow([...SESSIONS, twin], 'all', NOW).map(({ id }) => id)).toEqual([
      'session-past',
      'session-a-twin',
      'session-practice',
      'session-concert',
    ]);
  });
});

describe('summarizeSessionsInWindow', () => {
  it('keeps the sessions of the kind asked for, or every kind', () => {
    expect(summarizeSessionsInWindow(SESSIONS, 'all', 'concert', NOW).map(({ id }) => id)).toEqual([
      'session-concert',
    ]);
    expect(summarizeSessionsInWindow(SESSIONS, 'upcoming', undefined, NOW)).toEqual([
      summarizeSession(NEXT_PRACTICE),
      summarizeSession(CONCERT),
    ]);
  });
});

describe('matchSessionReference', () => {
  it('finds the next session, the next of one kind, and the last one', () => {
    expect(matchSessionReference(SESSIONS, 'next', NOW)).toEqual({
      kind: 'found',
      id: 'session-practice',
    });
    expect(matchSessionReference(SESSIONS, ' Next-Concert ', NOW)).toEqual({
      kind: 'found',
      id: 'session-concert',
    });
    expect(matchSessionReference(SESSIONS, 'next-practice', NOW)).toEqual({
      kind: 'found',
      id: 'session-practice',
    });
    const older = { ...PAST_PRACTICE, id: 'session-older', date: new Date('2026-10-01') };
    expect(matchSessionReference([older, ...SESSIONS], 'last', NOW)).toEqual({
      kind: 'found',
      id: 'session-past',
    });
  });

  it('answers missing when no session is next or last', () => {
    expect(matchSessionReference([PAST_PRACTICE], 'next-concert', NOW)).toEqual({
      kind: 'missing',
    });
    expect(matchSessionReference([CONCERT], 'last', NOW)).toEqual({ kind: 'missing' });
  });

  it('finds the session on a day in Paris, and lists the sessions sharing that day', () => {
    expect(matchSessionReference(SESSIONS, '2026-11-03', NOW)).toEqual({
      kind: 'found',
      id: 'session-practice',
    });
    expect(matchSessionReference([...SESSIONS, SAME_DAY_PRACTICE], '2026-11-07', NOW)).toEqual({
      kind: 'ambiguous',
      candidates: [
        { id: 'session-afternoon', label: 'practice 2026-11-07T14:00:00.000Z' },
        { id: 'session-concert', label: 'concert 2026-11-07T20:00:00.000Z' },
      ],
    });
    expect(matchSessionReference(SESSIONS, '2026-11-04', NOW)).toEqual({ kind: 'missing' });
  });

  it('reads the day in Paris rather than in UTC', () => {
    const lateEvening = { ...NEXT_PRACTICE, date: new Date('2026-11-03T23:30:00.000Z') };
    expect(matchSessionReference([lateEvening], '2026-11-04', NOW)).toEqual({
      kind: 'found',
      id: 'session-practice',
    });
    expect(matchSessionReference([lateEvening], '2027-11-04', NOW)).toEqual({ kind: 'missing' });
    expect(matchSessionReference([lateEvening], '2026-12-04', NOW)).toEqual({ kind: 'missing' });
  });

  it('finds a session by its id, and nothing for any other word', () => {
    expect(matchSessionReference(SESSIONS, 'session-concert', NOW)).toEqual({
      kind: 'found',
      id: 'session-concert',
    });
    expect(matchSessionReference(SESSIONS, 'tomorrow', NOW)).toEqual({ kind: 'missing' });
    expect(matchSessionReference(SESSIONS, 'constructor', NOW)).toEqual({ kind: 'missing' });
  });
});
