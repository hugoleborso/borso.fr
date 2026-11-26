import { describe, expect, it } from 'vitest';
import {
  checkPoster,
  normaliseMessage,
  pickDrawWinners,
  POSTER_MAX_BYTES,
} from './concert-public-page.core';

// @FollowsBlueprint test-pure-unit
describe('the public page of a concert', () => {
  it('accepts a JPEG, PNG or WebP poster up to the size limit', () => {
    expect(checkPoster('image/png', POSTER_MAX_BYTES)).toStrictEqual({
      contentType: 'image/png',
      refusalKey: null,
    });
    expect(checkPoster('image/gif', 10)).toStrictEqual({
      contentType: null,
      refusalKey: 'sessions.posterWrongType',
    });
    expect(checkPoster('image/webp', POSTER_MAX_BYTES + 1)).toStrictEqual({
      contentType: null,
      refusalKey: 'sessions.posterTooLarge',
    });
  });

  it('draws three distinct winners from the registrations', () => {
    const registeredNames = ['a', 'b', 'c', 'd', 'e'];
    expect(pickDrawWinners(registeredNames, () => 0)).toStrictEqual(['a', 'b', 'c']);
    expect(pickDrawWinners(registeredNames, () => 0.99)).toStrictEqual(['e', 'd', 'c']);
  });

  it('draws everyone when fewer register than there are prizes', () => {
    expect(pickDrawWinners(['a', 'b'], () => 0.5)).toStrictEqual(['b', 'a']);
    expect(pickDrawWinners([], () => 0.5)).toStrictEqual([]);
    expect(pickDrawWinners(['a', 'b', 'c'], () => 0, 1)).toStrictEqual(['a']);
  });

  it('clears a blank message and trims a written one', () => {
    expect(normaliseMessage('   ')).toBeNull();
    expect(normaliseMessage('  Venez nombreux\n')).toBe('Venez nombreux');
  });
});
