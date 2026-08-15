import { describe, expect, it } from 'vitest';
import {
  buildLookupCacheKey,
  listExpiredLookupCacheKeys,
  type LookupCacheEntry,
  mapOpenLibraryDocuments,
} from './openlibrary.core';

const FULL_DOCUMENT = {
  key: '/works/OL27448W',
  title: 'The Lord of the Rings',
  author_name: ['J. R. R. Tolkien', 'Christopher Tolkien'],
  first_publish_year: 1954,
  isbn: ['0618640150', '0261102389'],
  cover_i: 8231856,
  edition_count: 120,
};

// @FollowsBlueprint test-pure-unit
describe('mapOpenLibraryDocuments', () => {
  it('projects every field of a complete work', () => {
    expect(mapOpenLibraryDocuments({ docs: [FULL_DOCUMENT] })).toEqual([
      {
        key: '/works/OL27448W',
        title: 'The Lord of the Rings',
        author: 'J. R. R. Tolkien, Christopher Tolkien',
        firstPublishedYear: 1954,
        isbn: '0618640150',
        coverUrl: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
        editionCount: 120,
      },
    ]);
  });

  it('falls back on every optional field a work omits', () => {
    expect(
      mapOpenLibraryDocuments({ docs: [{ key: '/works/OL1W', title: 'Untitled bits' }] }),
    ).toEqual([
      {
        key: '/works/OL1W',
        title: 'Untitled bits',
        author: '',
        firstPublishedYear: null,
        isbn: null,
        coverUrl: null,
        editionCount: 0,
      },
    ]);
  });

  it('reads an empty isbn list as no isbn rather than as undefined', () => {
    const [hit] = mapOpenLibraryDocuments({ docs: [{ key: '/works/OL2W', title: 'A', isbn: [] }] });
    expect(hit?.isbn).toBeNull();
  });

  it('drops a work with no title rather than emitting a blank row', () => {
    expect(mapOpenLibraryDocuments({ docs: [{ key: '/works/OL3W' }, FULL_DOCUMENT] })).toHaveLength(
      1,
    );
  });

  it('drops a work whose title is the empty string', () => {
    expect(mapOpenLibraryDocuments({ docs: [{ key: '/works/OL4W', title: '' }] })).toEqual([]);
  });

  it('reads a response with no docs key as no matches', () => {
    expect(mapOpenLibraryDocuments({ numFound: 0 })).toEqual([]);
  });

  it('returns no matches when the payload is not the shape the endpoint documents', () => {
    expect(mapOpenLibraryDocuments('service unavailable')).toEqual([]);
  });

  it('returns no matches when a work carries no key', () => {
    expect(mapOpenLibraryDocuments({ docs: [{ title: 'Keyless' }] })).toEqual([]);
  });
});

describe('buildLookupCacheKey', () => {
  it('lowercases the query rather than uppercasing it', () => {
    expect(buildLookupCacheKey('Dune')).toBe('dune');
  });

  it('trims the surrounding whitespace so two spellings of one query share an entry', () => {
    expect(buildLookupCacheKey('  Dune  ')).toBe(buildLookupCacheKey('dune'));
  });
});

function buildCache(): Map<string, LookupCacheEntry> {
  return new Map<string, LookupCacheEntry>([
    ['dune', { value: [], expiresAt: 1000 }],
    ['solaris', { value: [], expiresAt: 3000 }],
  ]);
}

describe('listExpiredLookupCacheKeys', () => {
  it('names only the entries whose expiry has passed', () => {
    expect(listExpiredLookupCacheKeys(buildCache(), 2000)).toEqual(['dune']);
  });

  it('counts an entry expiring exactly now as expired', () => {
    expect(listExpiredLookupCacheKeys(buildCache(), 1000)).toEqual(['dune']);
  });

  it('names nothing while every entry is still live', () => {
    expect(listExpiredLookupCacheKeys(buildCache(), 999)).toEqual([]);
  });
});
