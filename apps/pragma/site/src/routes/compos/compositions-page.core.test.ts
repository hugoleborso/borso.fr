import { describe, expect, it } from 'vitest';
import {
  COMPOSITION_NUMBER_SLOT,
  selectCompositionOfSong,
  selectNextCompositionNumber,
} from './compositions-page.core';

const LINKED = { id: 'composition-1', songId: 'song-1' };
const UNLINKED = { id: 'composition-2', songId: null };
const DEFAULT_TITLE = `Composition ${COMPOSITION_NUMBER_SLOT}`;

// @FollowsBlueprint test-pure-unit
describe('the compositions screen', () => {
  it('numbers a new composition one past the compositions already there', () => {
    expect(selectNextCompositionNumber([], DEFAULT_TITLE)).toBe(1);
    expect(selectNextCompositionNumber(['Avignon Nice', 'Nice'], DEFAULT_TITLE)).toBe(3);
  });

  it('numbers a new composition one past the highest default title, so a deletion never repeats one', () => {
    expect(selectNextCompositionNumber(['Composition 1', 'Composition 3'], DEFAULT_TITLE)).toBe(4);
    expect(selectNextCompositionNumber(['Composition 12'], DEFAULT_TITLE)).toBe(13);
  });

  it('reads the number only from a title that is exactly the default title', () => {
    expect(
      selectNextCompositionNumber(
        [
          'Composition 9 live',
          'My Composition 9',
          'Composition ',
          'Composition 9b',
          'Composition x9',
        ],
        DEFAULT_TITLE,
      ),
    ).toBe(6);
  });

  it('reads the number around the words of the language the title is in', () => {
    expect(
      selectNextCompositionNumber(
        ['Compo n°7 (brouillon)'],
        `Compo n°${COMPOSITION_NUMBER_SLOT} (brouillon)`,
      ),
    ).toBe(8);
    expect(
      selectNextCompositionNumber(
        ['Compo n°7 (BROUILLON)', 'Xompo n°7 (brouillon)'],
        `Compo n°${COMPOSITION_NUMBER_SLOT} (brouillon)`,
      ),
    ).toBe(3);
  });

  it('finds the composition linking a song, and none for a song no composition links', () => {
    expect(selectCompositionOfSong([UNLINKED, LINKED], 'song-1')).toBe(LINKED);
    expect(selectCompositionOfSong([UNLINKED, LINKED], 'song-2')).toBeNull();
  });
});
