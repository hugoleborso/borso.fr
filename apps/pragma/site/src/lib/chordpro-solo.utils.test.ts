import { describe, expect, it } from 'vitest';
import {
  advanceImplicitSolo,
  IMPLICIT_SOLO_OPENED,
  isCommentDirective,
  isLyricLine,
  isSoloComment,
  shouldEndImplicitSolo,
  trimTrailingBlanks,
} from './chordpro-solo.utils';
import { type ChordProLine, parseChordProLine } from './chordpro.utils';

// @FollowsBlueprint test-pure-unit
describe('isCommentDirective', () => {
  it('accepts every spelling of a comment', () => {
    expect(['comment', 'c', 'comment_italic', 'ci'].map(isCommentDirective)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('rejects a directive that is not a comment', () => {
    expect(isCommentDirective('title')).toBe(false);
  });
});

describe('isLyricLine', () => {
  it('reads words between chords as lyrics', () => {
    expect(isLyricLine(parseChordProLine('R[D]ollin on the river'))).toBe(true);
  });

  it('does not join single letters split by chords into a word', () => {
    expect(isLyricLine(parseChordProLine('[C]a[G]b'))).toBe(false);
  });

  it('reads a plain line of words as lyrics', () => {
    expect(isLyricLine(parseChordProLine('Ooh, stop'))).toBe(true);
  });

  it('does not read bar lines, a repeat mark or a parenthesised aside as lyrics', () => {
    expect(isLyricLine(parseChordProLine('| [C] [E7] | x3 (guitar)'))).toBe(false);
    expect(isLyricLine(parseChordProLine('(piano)'))).toBe(false);
  });

  it('does not read a blank, a directive or a tab line as lyrics', () => {
    expect(isLyricLine({ kind: 'blank' })).toBe(false);
    expect(isLyricLine({ kind: 'directive', name: 'comment', value: 'Words' })).toBe(false);
    expect(isLyricLine({ kind: 'tab-line', text: 'e|--words--|' })).toBe(false);
  });
});

describe('isSoloComment', () => {
  it('accepts a comment holding the word solo in any case', () => {
    expect(isSoloComment({ kind: 'directive', name: 'c', value: 'Outro SOLO' })).toBe(true);
  });

  it('rejects a solo named by a directive that is not a comment', () => {
    expect(isSoloComment({ kind: 'directive', name: 'title', value: 'Solo' })).toBe(false);
  });
});

describe('shouldEndImplicitSolo', () => {
  const comment = { kind: 'directive', name: 'comment', value: 'Note' } as const;

  it('keeps a comment written before any row, as a note', () => {
    expect(shouldEndImplicitSolo(comment, { hasRows: false, isAfterBlank: false })).toBe(false);
  });

  it('ends on a comment written after a row', () => {
    expect(shouldEndImplicitSolo(comment, { hasRows: true, isAfterBlank: false })).toBe(true);
  });

  it('ends on a lyric only after a blank line', () => {
    const lyric = parseChordProLine('Words here');
    expect(shouldEndImplicitSolo(lyric, { hasRows: true, isAfterBlank: false })).toBe(false);
    expect(shouldEndImplicitSolo(lyric, { hasRows: true, isAfterBlank: true })).toBe(true);
  });
});

describe('advanceImplicitSolo', () => {
  it('counts a row and clears the blank once a row is read', () => {
    const afterRow = advanceImplicitSolo(IMPLICIT_SOLO_OPENED, parseChordProLine('[Am]'));
    expect(afterRow).toEqual({ hasRows: true, isAfterBlank: false });
    expect(advanceImplicitSolo(afterRow, { kind: 'blank' })).toEqual({
      hasRows: true,
      isAfterBlank: true,
    });
  });

  it('counts neither a note nor a leading blank as a row', () => {
    const note = { kind: 'directive', name: 'comment', value: 'Note' } as const;
    expect(advanceImplicitSolo(IMPLICIT_SOLO_OPENED, note)).toEqual(IMPLICIT_SOLO_OPENED);
    expect(advanceImplicitSolo(IMPLICIT_SOLO_OPENED, { kind: 'blank' })).toEqual(
      IMPLICIT_SOLO_OPENED,
    );
  });
});

describe('trimTrailingBlanks', () => {
  it('drops only the blank lines at the end', () => {
    const lines: ChordProLine[] = [
      { kind: 'blank' },
      parseChordProLine('[A]'),
      { kind: 'blank' },
      { kind: 'blank' },
    ];
    trimTrailingBlanks(lines);
    expect(lines.map((line) => line.kind)).toEqual(['blank', 'chord-line']);
  });
});
