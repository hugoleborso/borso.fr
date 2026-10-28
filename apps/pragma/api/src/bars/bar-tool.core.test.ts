import { describe, expect, it } from 'vitest';
import { summarizeBars } from './bar-tool.core';

const ZINC = {
  id: 'bar-zinc',
  name: 'Le Zinc',
  status: 'lead',
  city: 'Lyon',
  capacity: 80,
  lastInteractionAt: new Date('2026-10-01T10:00:00.000Z'),
};
const MAX = {
  id: 'bar-max',
  name: 'Chez Max',
  status: 'cold',
  city: null,
  capacity: null,
  lastInteractionAt: null,
};

function keep(filter: { query?: string; status?: string }): string[] {
  return summarizeBars([ZINC, MAX], filter).map((bar) => bar.id);
}

// @FollowsBlueprint test-pure-unit
describe('summarizeBars', () => {
  it('keeps what a prospect list needs, the last interaction as an ISO string', () => {
    expect(summarizeBars([ZINC, MAX], {})).toEqual([
      {
        id: 'bar-zinc',
        name: 'Le Zinc',
        status: 'lead',
        city: 'Lyon',
        capacity: 80,
        lastInteractionAt: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 'bar-max',
        name: 'Chez Max',
        status: 'cold',
        city: null,
        capacity: null,
        lastInteractionAt: null,
      },
    ]);
  });

  it('keeps the bars whose name or city holds the query, and those of one status', () => {
    expect(keep({ query: 'lyon' })).toEqual(['bar-zinc']);
    expect(keep({ query: 'zinc lyon' })).toEqual(['bar-zinc']);
    expect(keep({ query: 'max' })).toEqual(['bar-max']);
    expect(keep({ status: 'cold' })).toEqual(['bar-max']);
  });
});
