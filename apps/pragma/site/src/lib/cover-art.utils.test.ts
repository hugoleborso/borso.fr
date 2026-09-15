import { describe, expect, it } from 'vitest';
import { buildCoverArtUrl, selectCoverColor, selectCoverInitials } from './cover-art.utils';

describe('the address a cover is fetched from', () => {
  it('points at the release front thumbnail on Cover Art Archive', () => {
    expect(buildCoverArtUrl('abc-123')).toBe(
      'https://coverartarchive.org/release/abc-123/front-250',
    );
  });

  it('escapes what a release id could carry', () => {
    expect(buildCoverArtUrl('a/b?c')).toBe(
      'https://coverartarchive.org/release/a%2Fb%3Fc/front-250',
    );
  });

  it('has no address for a song that names no release', () => {
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
