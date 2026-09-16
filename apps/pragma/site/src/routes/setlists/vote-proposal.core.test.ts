import { describe, expect, it } from 'vitest';
import { moveWithin, readTargetSongCount, reorderByDrop } from './vote-proposal.core';

const PROPOSAL = ['song-a', 'song-b', 'song-c'];

// @FollowsBlueprint test-pure-unit
describe('moveWithin', () => {
  it('moves a song up and down', () => {
    expect(moveWithin(PROPOSAL, 1, 0)).toEqual(['song-b', 'song-a', 'song-c']);
    expect(moveWithin(PROPOSAL, 0, 2)).toEqual(['song-b', 'song-c', 'song-a']);
  });

  it('answers the same order when the index names nothing', () => {
    expect(moveWithin(PROPOSAL, 9, 0)).toEqual(PROPOSAL);
  });
});

describe('reorderByDrop', () => {
  it('drops a song where it was released', () => {
    expect(reorderByDrop(PROPOSAL, 'song-c', 'song-a')).toEqual(['song-c', 'song-a', 'song-b']);
  });

  it('leaves the order alone when the drop landed on nothing', () => {
    expect(reorderByDrop(PROPOSAL, 'song-c', null)).toEqual(PROPOSAL);
  });

  it('leaves the order alone when either end is not in the proposal', () => {
    expect(reorderByDrop(PROPOSAL, 'song-z', 'song-a')).toEqual(PROPOSAL);
    expect(reorderByDrop(PROPOSAL, 'song-a', 'song-z')).toEqual(PROPOSAL);
  });
});

describe('readTargetSongCount', () => {
  it('reads a number the member typed', () => {
    expect(readTargetSongCount('12', 15)).toBe(12);
  });

  it('keeps what was there when the field is emptied', () => {
    expect(readTargetSongCount('', 15)).toBe(15);
    expect(readTargetSongCount('nope', 15)).toBe(15);
  });

  it('clamps to the range the API accepts', () => {
    expect(readTargetSongCount('0', 15)).toBe(1);
    expect(readTargetSongCount('99', 15)).toBe(60);
  });
});
