import { describe, expect, it } from 'vitest';
import { replaceEntityBySlug } from './optimistic.utils';

// @FollowsBlueprint test-pure-unit
describe('replaceEntityBySlug', () => {
  const editions = [
    { slug: 'lepin-2025', status: 'finished' },
    { slug: 'lepin-2026', status: 'setup' },
  ];

  it('rewrites the matching entity and leaves its neighbours untouched', () => {
    expect(
      replaceEntityBySlug(editions, 'lepin-2026', (edition) => ({ ...edition, status: 'live' })),
    ).toEqual([
      { slug: 'lepin-2025', status: 'finished' },
      { slug: 'lepin-2026', status: 'live' },
    ]);
  });

  it('returns an equivalent list when no entity matches', () => {
    expect(
      replaceEntityBySlug(editions, 'lepin-2027', () => ({ slug: 'x', status: 'live' })),
    ).toEqual(editions);
  });

  it('returns an empty list for an empty list', () => {
    expect(replaceEntityBySlug([], 'lepin-2026', (edition) => edition)).toEqual([]);
  });
});
