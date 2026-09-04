import { describe, expect, it } from 'vitest';
import { buildSearchCacheKey, normalizeSearchQuery } from './search-cache.core';

// @FollowsBlueprint test-pure-unit
describe('normalizeSearchQuery', () => {
  it('trims and lowercases, so one typist warms the row for the next', () => {
    expect(normalizeSearchQuery('  Get Lucky ')).toBe('get lucky');
  });
});

describe('buildSearchCacheKey', () => {
  it('gives two providers two keys for one question, so neither reads the other row', () => {
    expect(buildSearchCacheKey('deezer', 'Get Lucky')).not.toBe(
      buildSearchCacheKey('musicbrainz', 'Get Lucky'),
    );
  });

  it('gives one provider one key for the same question typed two ways', () => {
    expect(buildSearchCacheKey('deezer', '  GET LUCKY ')).toBe(
      buildSearchCacheKey('deezer', 'Get Lucky'),
    );
  });

  it('names the provider in the key, so a stored row says what shape it holds', () => {
    expect(buildSearchCacheKey('deezer', 'Get Lucky')).toBe('deezer:get lucky');
  });
});
