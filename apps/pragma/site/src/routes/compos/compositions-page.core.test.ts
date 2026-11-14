import { describe, expect, it } from 'vitest';
import { selectCompositionOfSong, selectNextCompositionNumber } from './compositions-page.core';

const LINKED = { id: 'composition-1', songId: 'song-1' };
const UNLINKED = { id: 'composition-2', songId: null };

// @FollowsBlueprint test-pure-unit
describe('the compositions screen', () => {
  it('numbers a new composition one past the compositions already there', () => {
    expect(selectNextCompositionNumber([])).toBe(1);
    expect(selectNextCompositionNumber([LINKED, UNLINKED])).toBe(3);
  });

  it('finds the composition linking a song, and none for a song no composition links', () => {
    expect(selectCompositionOfSong([UNLINKED, LINKED], 'song-1')).toBe(LINKED);
    expect(selectCompositionOfSong([UNLINKED, LINKED], 'song-2')).toBeNull();
  });
});
