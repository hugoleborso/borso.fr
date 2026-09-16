import { describe, expect, it } from 'vitest';
import {
  IMPROVEMENT_STATUSES,
  isImprovementStatus,
  rankImprovements,
  resolveImprovementStatus,
  selectStatusRank,
} from './improvement.core';

describe('isImprovementStatus', () => {
  it('knows exactly the statuses the backlog declares', () => {
    for (const status of IMPROVEMENT_STATUSES) {
      expect(isImprovementStatus(status)).toBe(true);
    }
    expect(isImprovementStatus('wontfix')).toBe(false);
  });
});

describe('resolveImprovementStatus', () => {
  it('keeps a known status and falls back to an idea otherwise', () => {
    expect(resolveImprovementStatus('shipped')).toBe('shipped');
    expect(resolveImprovementStatus('wontfix')).toBe('idea');
  });
});

describe('selectStatusRank', () => {
  it('ranks the open statuses ahead of the closed ones', () => {
    expect(selectStatusRank('idea')).toBeLessThan(selectStatusRank('planned'));
    expect(selectStatusRank('building')).toBeLessThan(selectStatusRank('shipped'));
    expect(selectStatusRank('shipped')).toBeLessThan(selectStatusRank('declined'));
  });

  it('sends a status it does not know to the back of the list', () => {
    expect(selectStatusRank('wontfix')).toBeGreaterThan(selectStatusRank('declined'));
  });
});

const EPOCH = '2026-01-01T00:00:00.000Z';

describe('rankImprovements', () => {
  it('orders by status first', () => {
    const ranked = rankImprovements([
      { id: 'shipped', status: 'shipped', voteCount: 9, createdAt: EPOCH },
      { id: 'idea', status: 'idea', voteCount: 0, createdAt: EPOCH },
    ]);
    expect(ranked.map((row) => row.id)).toEqual(['idea', 'shipped']);
  });

  it('orders by votes inside one status', () => {
    const ranked = rankImprovements([
      { id: 'few', status: 'idea', voteCount: 1, createdAt: EPOCH },
      { id: 'many', status: 'idea', voteCount: 4, createdAt: EPOCH },
    ]);
    expect(ranked.map((row) => row.id)).toEqual(['many', 'few']);
  });

  it('breaks a tie with the older one first, reading a string or a Date alike', () => {
    const ranked = rankImprovements([
      { id: 'newer', status: 'idea', voteCount: 2, createdAt: '2026-02-01T00:00:00.000Z' },
      { id: 'older', status: 'idea', voteCount: 2, createdAt: new Date(EPOCH) },
    ]);
    expect(ranked.map((row) => row.id)).toEqual(['older', 'newer']);
  });

  it('answers a new array, so a cached list is never sorted in place', () => {
    const rows = [
      { id: 'b', status: 'planned', voteCount: 0, createdAt: EPOCH },
      { id: 'a', status: 'idea', voteCount: 0, createdAt: EPOCH },
    ];
    expect(rankImprovements(rows)).not.toBe(rows);
    expect(rows.map((row) => row.id)).toEqual(['b', 'a']);
  });
});
