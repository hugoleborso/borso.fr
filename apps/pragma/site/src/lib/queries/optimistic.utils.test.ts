import { describe, expect, it } from 'vitest';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';

// @FollowsBlueprint test-pure-unit
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

describe('settleTemporaryEntity', () => {
  const temporary = { id: 'temporary-1', name: 'Le Klub' };
  const persisted = { id: 'server-1', name: 'Le Klub' };

  it('swaps the temporary row for the row the server returned', () => {
    expect(settleTemporaryEntity([temporary], 'temporary-1', persisted)).toStrictEqual([persisted]);
  });

  it('keeps the rows that were already settled', () => {
    const settled = settleTemporaryEntity(
      [{ id: 'server-0', name: 'La Cave' }, temporary],
      'temporary-1',
      persisted,
    );

    expect(settled).toStrictEqual([{ id: 'server-0', name: 'La Cave' }, persisted]);
  });

  it('changes nothing when the temporary row is already gone', () => {
    expect(settleTemporaryEntity([persisted], 'temporary-1', persisted)).toStrictEqual([persisted]);
  });

  it('leaves an empty list empty', () => {
    expect(settleTemporaryEntity([], 'temporary-1', persisted)).toStrictEqual([]);
  });
});
