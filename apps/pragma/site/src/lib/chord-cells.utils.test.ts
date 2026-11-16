import { describe, expect, it } from 'vitest';
import { buildChordCells, groupCellsIntoWords, hasLyricText } from './chord-cells.utils';
import { parseChordProLine } from './chordpro.utils';

function cellsOf(line: string): ReturnType<typeof buildChordCells> {
  const chordLine = parseChordProLine(line);
  if (chordLine.kind !== 'chord-line') throw new Error(`not a chord line: ${line}`);
  return buildChordCells(chordLine.tokens);
}

// @FollowsBlueprint test-pure-unit
describe('buildChordCells', () => {
  it('puts each chord over the word it precedes and splits the rest into bare words', () => {
    expect(cellsOf('So if [Am]lonely you')).toEqual([
      { chord: null, lyric: 'So ' },
      { chord: null, lyric: 'if ' },
      { chord: 'Am', lyric: 'lonely ' },
      { chord: null, lyric: 'you' },
    ]);
  });

  it('keeps a chord in the middle of a word over the rest of that word', () => {
    expect(cellsOf('shot a[Bm]way')).toEqual([
      { chord: null, lyric: 'shot ' },
      { chord: null, lyric: 'a' },
      { chord: 'Bm', lyric: 'way' },
    ]);
  });

  it('keeps the leading spaces of a lyric with the chord before them', () => {
    expect(cellsOf('[E]   So')).toEqual([{ chord: 'E', lyric: '   So' }]);
  });

  it('gives a chord with no lyric after it an empty cell, back to back or at the end', () => {
    expect(cellsOf('[G][A]ah [D]')).toEqual([
      { chord: 'G', lyric: '' },
      { chord: 'A', lyric: 'ah ' },
      { chord: 'D', lyric: '' },
    ]);
  });
});

describe('hasLyricText', () => {
  it('is true when a word sits between the chords', () => {
    expect(
      hasLyricText([
        { kind: 'chord', chord: 'G' },
        { kind: 'lyric', text: 'ah' },
      ]),
    ).toBe(true);
  });

  it('is false when only spaces sit between the chords', () => {
    expect(
      hasLyricText([
        { kind: 'chord', chord: 'G' },
        { kind: 'lyric', text: '   ' },
      ]),
    ).toBe(false);
  });
});

describe('groupCellsIntoWords', () => {
  it('keeps the two halves of a word split by a chord together, and starts a word after a space', () => {
    expect(groupCellsIntoWords(cellsOf('half be[F]comes [G]'))).toEqual([
      [{ chord: null, lyric: 'half ' }],
      [
        { chord: null, lyric: 'be' },
        { chord: 'F', lyric: 'comes ' },
      ],
      [{ chord: 'G', lyric: '' }],
    ]);
  });

  it('returns no word for a line with no cell', () => {
    expect(groupCellsIntoWords([])).toEqual([]);
  });
});
