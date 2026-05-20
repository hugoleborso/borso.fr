import { describe, expect, it } from 'vitest';
import {
  MASTERY_SCORE_MAX,
  MASTERY_SCORE_MIN,
  cellKey,
  clampScore,
  columnAverage,
  rowAverage,
} from './mastery-matrix.utils';

describe('cellKey', () => {
  it('joins member and instrument ids', () => {
    expect(cellKey('m1', 'i1')).toBe('m1/i1');
  });
});

describe('rowAverage', () => {
  it('returns null when no scores exist for the row', () => {
    expect(rowAverage('m1', ['i1', 'i2'], {})).toBeNull();
  });

  it('averages only scored cells', () => {
    const scores = { 'm1/i1': 6, 'm1/i2': 8 };
    expect(rowAverage('m1', ['i1', 'i2'], scores)).toBe(7);
  });

  it('skips unscored cells', () => {
    const scores = { 'm1/i1': 6 };
    expect(rowAverage('m1', ['i1', 'i2'], scores)).toBe(6);
  });

  it('handles a single scored cell', () => {
    const scores = { 'm1/i1': 4 };
    expect(rowAverage('m1', ['i1'], scores)).toBe(4);
  });
});

describe('columnAverage', () => {
  it('returns null when no scores exist for the column', () => {
    expect(columnAverage('i1', ['m1', 'm2'], {})).toBeNull();
  });

  it('averages only scored cells', () => {
    const scores = { 'm1/i1': 3, 'm2/i1': 9 };
    expect(columnAverage('i1', ['m1', 'm2'], scores)).toBe(6);
  });
});

describe('clampScore', () => {
  it('returns 0 for values below 0', () => {
    expect(clampScore(-3)).toBe(MASTERY_SCORE_MIN);
  });

  it('returns 10 for values above 10', () => {
    expect(clampScore(15)).toBe(MASTERY_SCORE_MAX);
  });

  it('rounds non-integers', () => {
    expect(clampScore(7.4)).toBe(7);
    expect(clampScore(7.6)).toBe(8);
  });

  it('returns the value unchanged inside the range', () => {
    expect(clampScore(5)).toBe(5);
  });
});
