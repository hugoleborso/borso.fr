import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SONG_ORIGIN,
  isComposition,
  isSongOrigin,
  resolveSongOrigin,
  selectCompositions,
} from './song-origin.core';

describe('song origin', () => {
  it('recognises the two stored origins and nothing else', () => {
    expect(isSongOrigin('cover')).toBe(true);
    expect(isSongOrigin('original')).toBe(true);
    expect(isSongOrigin('remix')).toBe(false);
    expect(isSongOrigin(null)).toBe(false);
  });

  it('reads a row written before the column existed as a cover', () => {
    expect(resolveSongOrigin(null)).toBe(DEFAULT_SONG_ORIGIN);
    expect(resolveSongOrigin('remix')).toBe('cover');
    expect(resolveSongOrigin('original')).toBe('original');
  });

  it('keeps only the songs the band wrote', () => {
    const cover = { id: 'a', origin: 'cover' } as const;
    const original = { id: 'b', origin: 'original' } as const;
    expect(isComposition(cover)).toBe(false);
    expect(isComposition(original)).toBe(true);
    expect(selectCompositions([cover, original])).toEqual([original]);
  });
});
