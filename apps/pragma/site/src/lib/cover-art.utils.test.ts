import { describe, expect, it } from 'vitest';
import { buildCoverArtUrl, selectCoverColor, selectCoverInitials } from './cover-art.utils';

describe('the address a cover is fetched from', () => {
  it('points at the album image Deezer serves by album id', () => {
    expect(buildCoverArtUrl('12047952')).toBe(
      'https://api.deezer.com/album/12047952/image?size=big',
    );
  });

  it('escapes what an album id could carry', () => {
    expect(buildCoverArtUrl('a/b?c')).toBe('https://api.deezer.com/album/a%2Fb%3Fc/image?size=big');
  });

  it('has no address for a song that names no album', () => {
    expect(buildCoverArtUrl(null)).toBeNull();
    expect(buildCoverArtUrl('')).toBeNull();
    expect(buildCoverArtUrl('   ')).toBeNull();
  });
});

describe('the tile a song without a cover falls back to', () => {
  it('takes the first letter of the first two words', () => {
    expect(selectCoverInitials('Slow Burn')).toBe('SB');
    expect(selectCoverInitials('Move like jagger')).toBe('ML');
    expect(selectCoverInitials('Believer')).toBe('B');
  });

  it('ignores punctuation and empty titles', () => {
    expect(selectCoverInitials("  I'm Picky (unplugged) ")).toBe('IP');
    expect(selectCoverInitials('!!! ???')).toBe('');
    expect(selectCoverInitials('')).toBe('');
  });

  it('gives one song one colour, and two songs two', () => {
    expect(selectCoverColor('Slow Burn')).toBe('hsl(9 46% 62%)');
    expect(selectCoverColor('Move like jagger')).toBe('hsl(253 46% 62%)');
    expect(selectCoverColor('')).toBe('hsl(341 46% 62%)');
  });
});
