import { describe, expect, it } from 'vitest';
import { isSearchableQuery, normaliseSearchQuery } from './brain-search.core';

describe('the search query', () => {
  it('is trimmed', () => {
    expect(normaliseSearchQuery('  séville ')).toBe('séville');
  });

  it('needs two characters once trimmed', () => {
    expect(isSearchableQuery(' ab ')).toBe(true);
    expect(isSearchableQuery(' a ')).toBe(false);
  });
});
