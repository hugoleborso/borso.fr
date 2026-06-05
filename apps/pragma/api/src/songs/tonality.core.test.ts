import { describe, expect, it } from 'vitest';
import { deriveTonality } from './tonality.core';

describe('deriveTonality', () => {
  it('returns null for both ends on an empty source', () => {
    expect(deriveTonality('')).toEqual({ start: null, end: null });
  });

  it('returns null for both ends when nothing parses as a chord', () => {
    expect(deriveTonality('not a chord\nstill not')).toEqual({ start: null, end: null });
  });

  it('extracts start and end from bracketed chords', () => {
    const source = '[C]Hello [F]world\n[G]bye [Am]for now';
    expect(deriveTonality(source)).toEqual({ start: 'C', end: 'Am' });
  });

  it('extracts a chord with a sharp root', () => {
    expect(deriveTonality('[F#m]Hello')).toEqual({ start: 'F#m', end: 'F#m' });
  });

  it('extracts a chord with a flat root', () => {
    expect(deriveTonality('[Bb]Hello')).toEqual({ start: 'Bb', end: 'Bb' });
  });

  it('reports the root only for slash chords', () => {
    expect(deriveTonality('[G/B]Hello')).toEqual({ start: 'G', end: 'G' });
  });

  it('handles a chord-only line with multiple tokens', () => {
    expect(deriveTonality('C F G Am')).toEqual({ start: 'C', end: 'Am' });
  });

  it('ignores a chord-line if any token does not parse', () => {
    expect(deriveTonality('C F lyrics G')).toEqual({ start: null, end: null });
  });

  it('preserves the chord quality suffix', () => {
    expect(deriveTonality('[Dmaj7]Hello [G7]world')).toEqual({ start: 'Dmaj7', end: 'G7' });
  });

  it('uses the last chord-bearing line for the end', () => {
    const source = '[C]First\nlyrics only\n[G]Middle\nstill lyrics\n[Am]Last';
    expect(deriveTonality(source)).toEqual({ start: 'C', end: 'Am' });
  });

  it('uses the start of the only chord line for both ends when a single line carries one chord', () => {
    expect(deriveTonality('[C]Hello')).toEqual({ start: 'C', end: 'C' });
  });

  it('returns null when bracketed content is not a chord', () => {
    expect(deriveTonality('[verse]Lyrics')).toEqual({ start: null, end: null });
  });

  it('handles an empty bracket', () => {
    expect(deriveTonality('[]Hello')).toEqual({ start: null, end: null });
  });

  it('extracts the first and last bracketed chord on a single chord-bearing line', () => {
    expect(deriveTonality('[C]Hello [Am]world [F]end')).toEqual({ start: 'C', end: 'F' });
  });

  it('handles common sus / dim / aug shapes', () => {
    expect(deriveTonality('[Csus4]Hi [Ddim]Hello [Eaug]End')).toEqual({
      start: 'Csus4',
      end: 'Eaug',
    });
  });

  it('handles minor chords with the short m suffix', () => {
    expect(deriveTonality('[Am]Hello')).toEqual({ start: 'Am', end: 'Am' });
  });

  it('handles a chord-only line with whitespace padding', () => {
    expect(deriveTonality('   C    G   ')).toEqual({ start: 'C', end: 'G' });
  });

  it('returns null when there are only blank lines', () => {
    expect(deriveTonality('\n\n\n')).toEqual({ start: null, end: null });
  });
});
