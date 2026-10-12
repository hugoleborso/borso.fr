import { describe, expect, it } from 'vitest';
import { buildMemberPartPath, selectNextConcert, splitConcertHeading } from './next-concert.core';

const NOW = Date.parse('2026-05-01T12:00:00.000Z');

const PAST_CONCERT = { id: 'past', kind: 'concert', date: '2026-04-01T20:00:00.000Z' };
const LATER_CONCERT = { id: 'later', kind: 'concert', date: '2026-07-01T20:00:00.000Z' };
const SOONER_CONCERT = { id: 'sooner', kind: 'concert', date: '2026-06-01T20:00:00.000Z' };
const SOONER_PRACTICE = { id: 'practice', kind: 'practice', date: '2026-05-02T18:00:00.000Z' };
const SESSIONS = [PAST_CONCERT, LATER_CONCERT, SOONER_PRACTICE, SOONER_CONCERT];

// @FollowsBlueprint test-pure-unit
describe('selectNextConcert', () => {
  it('picks the soonest concert still to come, with the setlist attached to it', () => {
    const setlists = [
      { id: 'other', sessionIds: ['later'] },
      { id: 'main', sessionIds: ['past', 'sooner'] },
    ];
    expect(selectNextConcert(SESSIONS, setlists, NOW)).toStrictEqual({
      session: SOONER_CONCERT,
      setlistId: 'main',
    });
  });

  it('names no setlist when none is attached yet', () => {
    expect(selectNextConcert(SESSIONS, [], NOW)?.setlistId).toBeNull();
  });

  it('returns nothing when no concert is coming', () => {
    expect(selectNextConcert([PAST_CONCERT, SOONER_PRACTICE], [], NOW)).toBeNull();
  });
});

describe('buildMemberPartPath', () => {
  it('filters the setlist to the member', () => {
    expect(buildMemberPartPath('set-1', 'member-1')).toBe('/setlists/set-1?member=member-1');
  });

  it('opens the whole setlist when nobody is signed in yet', () => {
    expect(buildMemberPartPath('set-1', '')).toBe('/setlists/set-1');
  });
});

describe('splitConcertHeading', () => {
  it('puts the venue first and the date under it', () => {
    expect(splitConcertHeading('Le Petit Bain', 'Tue, Oct 13')).toStrictEqual({
      primary: 'Le Petit Bain',
      secondary: 'Tue, Oct 13',
    });
  });

  it('shows the date alone when no venue is known', () => {
    const dateOnly = { primary: 'Tue, Oct 13', secondary: null };
    expect(splitConcertHeading(null, 'Tue, Oct 13')).toStrictEqual(dateOnly);
    expect(splitConcertHeading('', 'Tue, Oct 13')).toStrictEqual(dateOnly);
  });
});
