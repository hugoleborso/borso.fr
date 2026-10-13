import { describe, expect, it } from 'vitest';
import { compareSongTallies, resolveSetlistStatus } from './setlist-vote.core';

// @FollowsBlueprint test-pure-unit
describe('resolveSetlistStatus', () => {
  it('reads a setlist with no status as locked', () => {
    expect(resolveSetlistStatus(null)).toBe('locked');
    expect(resolveSetlistStatus(undefined)).toBe('locked');
  });

  it('reads the voting phase back', () => {
    expect(resolveSetlistStatus('voting')).toBe('voting');
  });

  it('reads a status the application does not know as locked', () => {
    expect(resolveSetlistStatus('counting')).toBe('locked');
  });
});

function tally(songId: string, points: number, voterCount: number) {
  return { songId, points, voterCount };
}

describe('compareSongTallies', () => {
  it('ranks the song with more points first', () => {
    expect(compareSongTallies(tally('a', 2, 1), tally('b', 5, 1))).toBe(1);
    expect(compareSongTallies(tally('a', 5, 1), tally('b', 2, 1))).toBe(-1);
  });

  it('breaks a tie on points by the number of voters', () => {
    expect(compareSongTallies(tally('a', 4, 1), tally('b', 4, 2))).toBe(1);
    expect(compareSongTallies(tally('a', 4, 2), tally('b', 4, 1))).toBe(-1);
  });

  it('breaks a full tie by song identifier, so the order never depends on arrival', () => {
    expect(compareSongTallies(tally('a', 4, 2), tally('b', 4, 2))).toBeLessThan(0);
    expect(compareSongTallies(tally('b', 4, 2), tally('a', 4, 2))).toBeGreaterThan(0);
  });
});
