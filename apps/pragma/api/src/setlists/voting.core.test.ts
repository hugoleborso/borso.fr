import { describe, expect, it } from 'vitest';
import {
  computeBudget,
  DEFAULT_TARGET_SONG_COUNT,
  judgeScore,
  POINTS_PER_TARGET_SONG,
  proposeClosing,
  resolveTargetSongCount,
  selectScoreWriteIntent,
  selectTargetSongCount,
  selectWriteOutcome,
  tally,
} from './voting.core';

const ADA = 'member-ada';
const GRACE = 'member-grace';

function vote(memberId: string, songId: string, points: number) {
  return { memberId, songId, points };
}

// @FollowsBlueprint test-pure-unit
describe('voting.core', () => {
  it('falls back to the default target when the setlist names none', () => {
    expect(resolveTargetSongCount(null)).toBe(DEFAULT_TARGET_SONG_COUNT);
    expect(resolveTargetSongCount(8)).toBe(8);
  });

  it('gives three points per targeted song', () => {
    expect(computeBudget(10, [])).toEqual({
      total: 10 * POINTS_PER_TARGET_SONG,
      spent: 0,
      remaining: 30,
    });
  });

  it('counts what a member has already posted', () => {
    const budget = computeBudget(2, [vote(ADA, 'song-a', 3), vote(ADA, 'song-b', 1)]);
    expect(budget).toEqual({ total: 6, spent: 4, remaining: 2 });
  });

  it('accepts a score that fits the remaining budget', () => {
    const verdict = judgeScore(2, [vote(ADA, 'song-a', 3)], 'song-b', 3);
    expect(verdict).toEqual({ kind: 'accepted', budget: { total: 6, spent: 6, remaining: 0 } });
  });

  it('refuses a score one point over the budget', () => {
    const verdict = judgeScore(1, [vote(ADA, 'song-a', 3)], 'song-b', 1);
    expect(verdict).toEqual({
      kind: 'budget-exhausted',
      budget: { total: 3, spent: 3, remaining: 0 },
    });
  });

  it('frees the points a song already held when it is rescored', () => {
    const verdict = judgeScore(1, [vote(ADA, 'song-a', 3)], 'song-a', 1);
    expect(verdict).toEqual({ kind: 'accepted', budget: { total: 3, spent: 1, remaining: 2 } });
  });

  it('accepts a score of zero, which takes a song back off', () => {
    const verdict = judgeScore(1, [vote(ADA, 'song-a', 3)], 'song-a', 0);
    expect(verdict).toEqual({ kind: 'accepted', budget: { total: 3, spent: 0, remaining: 3 } });
  });

  it('sums the points of every member and counts the voters', () => {
    expect(tally([vote(ADA, 'song-a', 2), vote(GRACE, 'song-a', 3)])).toEqual([
      {
        songId: 'song-a',
        points: 5,
        voterCount: 2,
        pointsByMember: { [ADA]: 2, [GRACE]: 3 },
      },
    ]);
  });

  it('leaves a song nobody scored out of the tally', () => {
    expect(tally([vote(ADA, 'song-a', 0)])).toEqual([]);
  });

  it('ranks by points, then by voter count, then by identifier', () => {
    const ranked = tally([
      vote(ADA, 'song-b', 3),
      vote(ADA, 'song-a', 2),
      vote(GRACE, 'song-a', 1),
      vote(ADA, 'song-c', 3),
      vote(GRACE, 'song-c', 0),
    ]);
    expect(ranked.map((entry) => entry.songId)).toEqual(['song-a', 'song-b', 'song-c']);
  });

  it('proposes every song when the tally is shorter than the target', () => {
    const tallies = tally([vote(ADA, 'song-a', 3)]);
    expect(proposeClosing(tallies, 5)).toHaveLength(1);
  });

  it('cuts at the target when nothing ties at the boundary', () => {
    const tallies = tally([vote(ADA, 'song-a', 3), vote(ADA, 'song-b', 2), vote(ADA, 'song-c', 1)]);
    expect(proposeClosing(tallies, 2).map((entry) => entry.songId)).toEqual(['song-a', 'song-b']);
  });

  it('proposes every song tied with the last one it would keep', () => {
    const tallies = tally([
      vote(ADA, 'song-a', 3),
      vote(ADA, 'song-b', 2),
      vote(ADA, 'song-c', 2),
      vote(ADA, 'song-d', 2),
      vote(ADA, 'song-e', 1),
    ]);
    const proposed = proposeClosing(tallies, 2).map((entry) => entry.songId);
    expect(proposed).toEqual(['song-a', 'song-b', 'song-c', 'song-d']);
  });

  it('uses the default target when the setlist names none', () => {
    const tallies = tally([vote(ADA, 'song-a', 1)]);
    expect(proposeClosing(tallies, null)).toHaveLength(1);
  });

  it('proposes nothing from an empty tally', () => {
    expect(proposeClosing([], 3)).toEqual([]);
  });
});

describe('voting.core write decisions', () => {
  it('removes a vote scored zero and stores every other score', () => {
    expect(selectScoreWriteIntent(0)).toBe('remove');
    expect(selectScoreWriteIntent(1)).toBe('store');
    expect(selectScoreWriteIntent(3)).toBe('store');
  });

  it('prefers the target the caller asked for, and keeps the stored one otherwise', () => {
    expect(selectTargetSongCount(12, 15)).toBe(12);
    expect(selectTargetSongCount(null, 15)).toBe(15);
    expect(selectTargetSongCount(null, null)).toBeNull();
  });

  it('reads an update that touched no row as a missing setlist', () => {
    expect(selectWriteOutcome(0)).toBe('missing');
    expect(selectWriteOutcome(1)).toBe('written');
  });

  it('gives a song with no points at all no place in the tally', () => {
    expect(tally([{ memberId: ADA, songId: 'song-a', points: -1 }])).toEqual([]);
  });

  it('proposes the whole ranking when the target is longer than it', () => {
    const tallies = tally([vote(ADA, 'song-a', 3), vote(ADA, 'song-b', 2)]);
    expect(proposeClosing(tallies, 2)).toHaveLength(2);
  });
});
