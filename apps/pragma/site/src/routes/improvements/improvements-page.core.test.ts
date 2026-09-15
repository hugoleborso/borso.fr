import { describe, expect, it } from 'vitest';
import {
  IMPROVEMENT_STATUSES,
  filterByStatus,
  readStatus,
  selectImprovementDeletionEffect,
  selectStatusLabelKey,
} from './improvements-page.core';

// @FollowsBlueprint test-pure-unit
describe('selectStatusLabelKey', () => {
  it('names one catalogue key per status', () => {
    const keys = IMPROVEMENT_STATUSES.map(selectStatusLabelKey);
    expect(new Set(keys).size).toBe(IMPROVEMENT_STATUSES.length);
    expect(selectStatusLabelKey('idea')).toBe('improvements.statusIdea');
  });
});

describe('filterByStatus', () => {
  const rows = [{ status: 'idea' }, { status: 'shipped' }, { status: 'idea' }];

  it('keeps every row when nothing is filtered', () => {
    expect(filterByStatus(rows, 'all')).toHaveLength(3);
  });

  it('keeps only the rows in the asked status', () => {
    expect(filterByStatus(rows, 'shipped')).toEqual([{ status: 'shipped' }]);
  });

  it('answers a new array, so the cached list is never sorted in place', () => {
    expect(filterByStatus(rows, 'all')).not.toBe(rows);
  });
});

describe('selectImprovementDeletionEffect', () => {
  it('empties the form when the deleted row is the one being edited', () => {
    expect(selectImprovementDeletionEffect('a', 'a')).toBe('clear-form');
  });

  it('leaves the form alone otherwise', () => {
    expect(selectImprovementDeletionEffect('a', 'b')).toBe('keep-form');
    expect(selectImprovementDeletionEffect(null, 'b')).toBe('keep-form');
  });
});

describe('readStatus', () => {
  it('answers the status itself when the value is one the backlog declares', () => {
    for (const status of IMPROVEMENT_STATUSES) {
      expect(readStatus(status)).toBe(status);
    }
  });

  it('falls back to an idea for a value the backlog does not know', () => {
    expect(readStatus('wontfix')).toBe('idea');
  });
});
