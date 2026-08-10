import { describe, expect, it } from 'vitest';
import { extractChartKind, selectChordProText } from './chart-kind.utils';

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

describe('selectChordProText', () => {
  it('returns the source of a chordpro chart', () => {
    expect(selectChordProText({ kind: 'chordpro', text: '{t: Song}' })).toBe('{t: Song}');
  });

  it('returns null for a chart of another kind', () => {
    expect(selectChordProText({ kind: 'pdf' })).toBeNull();
    expect(selectChordProText({ kind: 'image' })).toBeNull();
  });

  it('returns null for a chart of another kind that does carry text', () => {
    expect(selectChordProText({ kind: 'pdf', text: '{t: Song}' })).toBeNull();
  });

  it('returns null when the song carries no chart at all', () => {
    expect(selectChordProText(null)).toBeNull();
    expect(selectChordProText(undefined)).toBeNull();
  });

  it('returns null for a chordpro chart whose text is missing or not a string', () => {
    expect(selectChordProText({ kind: 'chordpro' })).toBeNull();
    expect(selectChordProText({ kind: 'chordpro', text: 42 })).toBeNull();
  });
});
