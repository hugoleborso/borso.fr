import { describe, expect, it } from 'vitest';
import {
  isLastPendingMutation,
  LAST_PENDING_MUTATION_COUNT,
  replaceEntityById,
} from './optimistic.utils';

describe('isLastPendingMutation', () => {
  it('treats the lone settling mutation as the last one', () => {
    expect(isLastPendingMutation(LAST_PENDING_MUTATION_COUNT)).toBe(true);
  });

  it('treats a drained family (zero pending) as the last one', () => {
    expect(isLastPendingMutation(0)).toBe(true);
  });

  it('holds back invalidation while siblings are still pending', () => {
    expect(isLastPendingMutation(2)).toBe(false);
    expect(isLastPendingMutation(5)).toBe(false);
  });
});

describe('replaceEntityById', () => {
  const entities = [
    { id: 'first', name: 'Le Klub' },
    { id: 'second', name: 'La Cave' },
  ];

  it('rewrites the matching entity and leaves the others untouched', () => {
    const rewritten = replaceEntityById(entities, 'second', (bar) => ({ ...bar, name: 'Le Sous' }));

    expect(rewritten).toStrictEqual([
      { id: 'first', name: 'Le Klub' },
      { id: 'second', name: 'Le Sous' },
    ]);
    expect(rewritten[0]).toBe(entities[0]);
  });

  it('returns an equal list when no entity carries the id', () => {
    const rewritten = replaceEntityById(entities, 'missing', (bar) => ({
      ...bar,
      name: 'Le Sous',
    }));

    expect(rewritten).toStrictEqual(entities);
  });

  it('leaves an empty list empty', () => {
    expect(replaceEntityById([], 'first', (entity) => entity)).toStrictEqual([]);
  });
});
