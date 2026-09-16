import { describe, expect, it } from 'vitest';
import { selectNotConcertReadyLabelKey } from './pool-song-row.core';

// @FollowsBlueprint test-pure-unit
describe('selectNotConcertReadyLabelKey', () => {
  it('marks a song the room invented, which enters the catalogue as an idea', () => {
    expect(selectNotConcertReadyLabelKey('idea')).toBe('audience.notConcertReadyIdea');
  });

  it('marks a song the band is still working on', () => {
    expect(selectNotConcertReadyLabelKey('wip')).toBe('audience.notConcertReadyWip');
  });

  it('marks a rehearsed song, because rehearsed is not stage tested', () => {
    expect(selectNotConcertReadyLabelKey('rehearsed')).toBe('audience.notConcertReadyRehearsed');
  });

  it('marks nothing on a concert-ready song, so the row carries no badge at all', () => {
    expect(selectNotConcertReadyLabelKey('concert_ready')).toBe(null);
  });

  it('marks nothing on a status it does not know, rather than inventing a label', () => {
    expect(selectNotConcertReadyLabelKey('retired')).toBe(null);
    expect(selectNotConcertReadyLabelKey('')).toBe(null);
  });
});
