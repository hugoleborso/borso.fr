import { describe, expect, it } from 'vitest';
import {
  countLineupMembers,
  selectChordProSource,
  selectComposition,
  selectUploadedChart,
} from './compos-page.core';

// @FollowsBlueprint test-pure-unit
describe('selectChordProSource', () => {
  it('answers the text only for a chart written inline', () => {
    expect(selectChordProSource({ kind: 'chordpro', text: '[C]Hello' })).toBe('[C]Hello');
    expect(selectChordProSource({ kind: 'pdf', s3Key: 'charts/a.pdf' })).toBeNull();
    expect(selectChordProSource(null)).toBeNull();
  });
});

describe('selectUploadedChart', () => {
  it('answers the stored file only for a chart that is one', () => {
    expect(selectUploadedChart({ kind: 'pdf', s3Key: 'charts/a.pdf' })).toEqual({
      kind: 'pdf',
      s3Key: 'charts/a.pdf',
    });
    expect(selectUploadedChart({ kind: 'image', s3Key: 'charts/a.png' })).toEqual({
      kind: 'image',
      s3Key: 'charts/a.png',
    });
    expect(selectUploadedChart({ kind: 'chordpro', text: '[C]' })).toBeNull();
    expect(selectUploadedChart(null)).toBeNull();
  });
});

describe('countLineupMembers', () => {
  it('counts only the members actually holding something', () => {
    expect(
      countLineupMembers({
        'member-1': ['guitar'],
        'member-2': [],
        'member-3': ['drums', 'vocals'],
      }),
    ).toBe(2);
    expect(countLineupMembers({})).toBe(0);
  });
});

describe('selectComposition', () => {
  const compositions = [{ id: 'a' }, { id: 'b' }];

  it('opens the named composition, and the first one when none is named or known', () => {
    expect(selectComposition(compositions, 'b')).toEqual({ id: 'b' });
    expect(selectComposition(compositions, null)).toEqual({ id: 'a' });
    expect(selectComposition(compositions, 'missing')).toEqual({ id: 'a' });
    expect(selectComposition([], 'a')).toBeNull();
  });
});
