import { describe, expect, it } from 'vitest';
import { extractChartKind } from './chart-kind.utils';

describe('extractChartKind', () => {
  it('returns null for a missing chart (the regression case — API field is `chart`, not `chordChart`)', () => {
    expect(extractChartKind(null)).toBe(null);
    expect(extractChartKind(undefined)).toBe(null);
  });

  it('returns the chordpro tag', () => {
    expect(extractChartKind({ kind: 'chordpro' })).toBe('chordpro');
  });

  it('returns the pdf tag', () => {
    expect(extractChartKind({ kind: 'pdf' })).toBe('pdf');
  });

  it('returns the image tag', () => {
    expect(extractChartKind({ kind: 'image' })).toBe('image');
  });

  it('rejects unknown kinds rather than passing them through', () => {
    expect(extractChartKind({ kind: 'midi' })).toBe(null);
    expect(extractChartKind({})).toBe(null);
  });
});
