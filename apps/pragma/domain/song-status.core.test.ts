import { describe, expect, it } from 'vitest';
import { SONG_STATUSES } from './song-status.core';

// @FollowsBlueprint test-pure-unit
describe('song statuses', () => {
  it('runs from idea to concert ready, with to play before work starts', () => {
    expect(SONG_STATUSES).toEqual(['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready']);
  });
});
