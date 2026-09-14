import { describe, expect, it } from 'vitest';
import { applyScoreToBoard, readMemberPoints, type VoteBoard } from './voting.utils';

const ADA = 'member-ada';
const GRACE = 'member-grace';

const BOARD: VoteBoard = {
  status: 'voting',
  targetSongCount: 2,
  budget: { total: 6, spent: 3, remaining: 3 },
  tallies: [
    { songId: 'song-a', points: 3, voterCount: 1, pointsByMember: { [ADA]: 3 } },
    { songId: 'song-b', points: 2, voterCount: 1, pointsByMember: { [GRACE]: 2 } },
  ],
};

// @FollowsBlueprint test-pure-unit
describe('voting.utils', () => {
  it('reads what a member gave a song, and zero when they gave nothing', () => {
    expect(readMemberPoints(BOARD, ADA, 'song-a')).toBe(3);
    expect(readMemberPoints(BOARD, ADA, 'song-b')).toBe(0);
    expect(readMemberPoints(BOARD, ADA, 'song-unknown')).toBe(0);
  });

  it('adds a member to a song another member already carries', () => {
    const next = applyScoreToBoard(BOARD, ADA, 'song-b', 1);
    const songB = next.tallies.find((tally) => tally.songId === 'song-b');
    expect(songB).toEqual({
      songId: 'song-b',
      points: 3,
      voterCount: 2,
      pointsByMember: { [GRACE]: 2, [ADA]: 1 },
    });
    expect(next.budget).toEqual({ total: 6, spent: 4, remaining: 2 });
  });

  it('replaces the points a member already gave rather than adding to them', () => {
    const next = applyScoreToBoard(BOARD, ADA, 'song-a', 1);
    expect(next.tallies[0]?.points).toBe(2);
    expect(next.budget).toEqual({ total: 6, spent: 1, remaining: 5 });
  });

  it('drops a song from the board when its last voter scores it zero', () => {
    const next = applyScoreToBoard(BOARD, ADA, 'song-a', 0);
    expect(next.tallies.map((tally) => tally.songId)).toEqual(['song-b']);
    expect(next.budget).toEqual({ total: 6, spent: 0, remaining: 6 });
  });

  it('keeps a song the other voters still carry', () => {
    const shared = applyScoreToBoard(BOARD, GRACE, 'song-a', 2);
    const next = applyScoreToBoard(shared, ADA, 'song-a', 0);
    expect(next.tallies.find((tally) => tally.songId === 'song-a')).toEqual({
      songId: 'song-a',
      points: 2,
      voterCount: 1,
      pointsByMember: { [GRACE]: 2 },
    });
  });

  it('adds a song the board had never seen', () => {
    const next = applyScoreToBoard(BOARD, ADA, 'song-c', 2);
    expect(next.tallies.map((tally) => tally.songId)).toEqual(['song-a', 'song-b', 'song-c']);
  });

  it('never adds a song that was scored zero', () => {
    const next = applyScoreToBoard(BOARD, ADA, 'song-c', 0);
    expect(next.tallies.map((tally) => tally.songId)).toEqual(['song-a', 'song-b']);
  });

  it('keeps the board ranked by points, then voters, then identifier', () => {
    const next = applyScoreToBoard(BOARD, GRACE, 'song-b', 3);
    expect(next.tallies.map((tally) => tally.songId)).toEqual(['song-a', 'song-b']);
    const tied = applyScoreToBoard(next, ADA, 'song-b', 1);
    expect(tied.tallies.map((tally) => tally.songId)).toEqual(['song-b', 'song-a']);
  });
});
