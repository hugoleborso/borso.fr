import { describe, expect, it } from 'vitest';
import {
  parseChordPro,
  parseChordProLine,
  readTitle,
  transposeChord,
  transposeLines,
} from './chordpro.utils';

describe('parseChordProLine', () => {
  it('parses a blank line', () => {
    expect(parseChordProLine('')).toEqual({ kind: 'blank' });
    expect(parseChordProLine('   ')).toEqual({ kind: 'blank' });
  });

  it('parses a directive with value', () => {
    expect(parseChordProLine('{title: Take Five}')).toEqual({
      kind: 'directive',
      name: 'title',
      value: 'Take Five',
    });
  });

  it('parses a directive without value', () => {
    expect(parseChordProLine('{start_of_chorus}')).toEqual({
      kind: 'directive',
      name: 'start_of_chorus',
      value: '',
    });
  });

  it('parses a plain lyric line (no chords)', () => {
    expect(parseChordProLine('Just a normal line')).toEqual({
      kind: 'plain-line',
      text: 'Just a normal line',
    });
  });

  it('parses a chord-over-lyric line', () => {
    const line = parseChordProLine('[C]Hello [G]world');
    expect(line).toEqual({
      kind: 'chord-line',
      tokens: [
        { kind: 'chord', chord: 'C' },
        { kind: 'lyric', text: 'Hello ' },
        { kind: 'chord', chord: 'G' },
        { kind: 'lyric', text: 'world' },
      ],
    });
  });

  it('parses a chord-line starting with lyric text before the first chord', () => {
    const line = parseChordProLine('Hello [G]world');
    expect(line.kind).toBe('chord-line');
    if (line.kind !== 'chord-line') return;
    expect(line.tokens[0]).toEqual({ kind: 'lyric', text: 'Hello ' });
  });
});

describe('parseChordPro', () => {
  it('splits on newlines and parses each line', () => {
    const lines = parseChordPro('{title: Hello}\n[C]Hi\n');
    expect(lines.length).toBe(3);
    expect(lines[0]?.kind).toBe('directive');
    expect(lines[1]?.kind).toBe('chord-line');
    expect(lines[2]?.kind).toBe('blank');
  });
});

describe('readTitle', () => {
  it('reads {title: ...}', () => {
    const lines = parseChordPro('{title: My Song}');
    expect(readTitle(lines)).toBe('My Song');
  });

  it('reads {t: ...} as a shorthand', () => {
    const lines = parseChordPro('{t: Short}');
    expect(readTitle(lines)).toBe('Short');
  });

  it('returns null when no title directive is present', () => {
    const lines = parseChordPro('[C]Hi');
    expect(readTitle(lines)).toBeNull();
  });
});

describe('transposeChord', () => {
  it('returns the input unchanged when semitones=0', () => {
    expect(transposeChord('C', 0)).toBe('C');
  });

  it('transposes a natural root up', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('G', 5)).toBe('C');
  });

  it('wraps around the octave', () => {
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('C', -1)).toBe('B');
  });

  it('preserves chord suffixes', () => {
    expect(transposeChord('Cm7', 2)).toBe('Dm7');
    expect(transposeChord('Gmaj7', 1)).toBe('G#maj7');
  });

  it('handles sharp accidentals', () => {
    expect(transposeChord('C#', 1)).toBe('D');
    expect(transposeChord('F#m', 2)).toBe('G#m');
  });

  it('handles flat accidentals (normalised to sharp on output)', () => {
    expect(transposeChord('Db', 1)).toBe('D');
    expect(transposeChord('Bbm', 2)).toBe('Cm');
  });

  it('leaves an unparseable token alone', () => {
    expect(transposeChord('NotAChord', 2)).toBe('NotAChord');
  });

  it('handles negative semitone wrap', () => {
    expect(transposeChord('C', -2)).toBe('A#');
  });
});

describe('transposeLines', () => {
  it('returns the same reference (no-op) when semitones=0', () => {
    const lines = parseChordPro('[C]Hi');
    expect(transposeLines(lines, 0)).toBe(lines);
  });

  it('shifts only chord tokens; lyric tokens stay intact', () => {
    const lines = parseChordPro('[C]Hello [G]world');
    const shifted = transposeLines(lines, 2);
    expect(shifted[0]).toEqual({
      kind: 'chord-line',
      tokens: [
        { kind: 'chord', chord: 'D' },
        { kind: 'lyric', text: 'Hello ' },
        { kind: 'chord', chord: 'A' },
        { kind: 'lyric', text: 'world' },
      ],
    });
  });

  it('leaves non-chord lines unchanged', () => {
    const lines = parseChordPro('{title: Hi}\n\nPlain text');
    const shifted = transposeLines(lines, 3);
    expect(shifted[0]).toEqual({ kind: 'directive', name: 'title', value: 'Hi' });
    expect(shifted[1]).toEqual({ kind: 'blank' });
    expect(shifted[2]).toEqual({ kind: 'plain-line', text: 'Plain text' });
  });
});
