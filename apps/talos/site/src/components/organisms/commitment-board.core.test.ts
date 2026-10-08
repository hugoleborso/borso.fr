import { describe, expect, it } from 'vitest';
import {
  readCommitmentFilter,
  selectCommitmentFilterLabelKey,
  selectDirectionIcon,
  selectVisibleCommitments,
} from './commitment-board.core';

const COMMITMENTS = [
  { path: 'a', direction: 'owed' as const },
  { path: 'b', direction: 'awaited' as const },
  { path: 'c', direction: null },
];

describe('readCommitmentFilter', () => {
  it('reads a known filter from the address and falls back on all', () => {
    expect(readCommitmentFilter('owed')).toBe('owed');
    expect(readCommitmentFilter('awaited')).toBe('awaited');
    expect(readCommitmentFilter('autre')).toBe('all');
    expect(readCommitmentFilter(null)).toBe('all');
  });
});

describe('selectVisibleCommitments', () => {
  it('keeps one direction, or every commitment', () => {
    expect(selectVisibleCommitments(COMMITMENTS, 'owed').map((entry) => entry.path)).toEqual(['a']);
    expect(selectVisibleCommitments(COMMITMENTS, 'awaited').map((entry) => entry.path)).toEqual([
      'b',
    ]);
    expect(selectVisibleCommitments(COMMITMENTS, 'all')).toHaveLength(3);
  });
});

describe('selectCommitmentFilterLabelKey', () => {
  it('labels each filter', () => {
    expect(selectCommitmentFilterLabelKey('owed')).toBe('commitments.filter.owed');
    expect(selectCommitmentFilterLabelKey('awaited')).toBe('commitments.filter.awaited');
    expect(selectCommitmentFilterLabelKey('all')).toBe('commitments.filter.all');
  });
});

describe('selectDirectionIcon', () => {
  it('draws the direction, or a plain commitment when it is unknown', () => {
    expect(selectDirectionIcon('owed')).toBe('owed');
    expect(selectDirectionIcon(null)).toBe('commitment');
  });
});
