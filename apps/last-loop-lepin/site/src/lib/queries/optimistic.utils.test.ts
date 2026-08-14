import { describe, expect, it } from 'vitest';
import {
  isLastPendingMutation,
  LAST_PENDING_MUTATION_COUNT,
  replaceEntityBySlug,
} from './optimistic.utils';

// @FollowsBlueprint test-pure-unit
describe('isLastPendingMutation', () => {
  it('says yes for the settling mutation counting only itself', () => {
    expect(isLastPendingMutation(LAST_PENDING_MUTATION_COUNT)).toBe(true);
  });

  it('says yes when the count has already reached zero', () => {
    expect(isLastPendingMutation(0)).toBe(true);
  });

  it('says no while another write of the family is still in flight', () => {
    expect(isLastPendingMutation(2)).toBe(false);
  });
});

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
