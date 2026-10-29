import { describe, expect, it } from 'vitest';
import {
  describeChordChartAdded,
  convertChordsAboveLyrics,
  isChordLine,
  isChordPro,
  isChordSymbol,
} from './chords-above-lyrics.core';

describe('isChordSymbol', () => {
  it.each(['A', 'Am', 'F#m7', 'Bb', 'Cmaj7', 'Dsus4', 'G/B', 'Eadd9', 'C7b9', 'Ddim', 'E+'])(
    'reads %s as a chord',
    (symbol) => {
      expect(isChordSymbol(symbol)).toBe(true);
    },
  );

  it.each(['Ain', 'H', 'the', 'Am)', 'x2', ''])('does not read %s as a chord', (word) => {
    expect(isChordSymbol(word)).toBe(false);
  });
});

describe('isChordLine', () => {
  it('reads a line made only of chords and bar separators as a chord line', () => {
    expect(isChordLine('  Am   |  G   C ||')).toBe(true);
  });

  it('refuses a line with one word that is not a chord', () => {
    expect(isChordLine('Am  then G')).toBe(false);
  });

  it('refuses a line of separators alone', () => {
    expect(isChordLine(' | | ')).toBe(false);
  });

  it('refuses an empty line', () => {
    expect(isChordLine('')).toBe(false);
  });
});

describe('isChordPro', () => {
  it('recognises a bracketed chord inside a lyric', () => {
    expect(isChordPro("[Am]Ain't no sunshine")).toBe(true);
  });

  it('recognises a directive line', () => {
    expect(isChordPro('{title: Song}\nla la')).toBe(true);
  });

  it('does not take a section label for a chord', () => {
    expect(isChordPro('[Verse 1]\nla la')).toBe(false);
  });
});

describe('convertChordsAboveLyrics', () => {
  it('places each chord on the syllable it stood above', () => {
    const pasted = "Am                Em   G\nAin't no sunshine when she's gone";
    expect(convertChordsAboveLyrics(pasted)).toEqual({
      chordPro: "[Am]Ain't no sunshine [Em]when [G]she's gone",
      hasChords: true,
      isChanged: true,
    });
  });

  it('reads a tab in a chord line as reaching the next column of eight', () => {
    expect(convertChordsAboveLyrics('Am\tG\nHello there world').chordPro).toBe(
      '[Am]Hello th[G]ere world',
    );
  });

  it('keeps the indent of a lyric line', () => {
    expect(convertChordsAboveLyrics('  Am\n  Hello').chordPro).toBe('  [Am]Hello');
  });

  it('brackets a chord line with no lyric under it, without its outer spaces', () => {
    expect(convertChordsAboveLyrics('   Am   G   ').chordPro).toBe('[Am]   [G]');
  });

  it('places no bar separator in the lyric, only the chords', () => {
    expect(convertChordsAboveLyrics('Am | G\nHello there').chordPro).toBe('[Am]Hello[G] there');
  });

  it('keeps a line of spaces between a chord line and the lyric below as it is', () => {
    expect(convertChordsAboveLyrics('Am  G\n   \nHello').chordPro).toBe('[Am]  [G]\n   \nHello');
  });

  it('writes a section label without the spaces inside its brackets', () => {
    expect(convertChordsAboveLyrics('[ Chorus ]\nAm\nHello').chordPro).toBe(
      '{comment: Chorus}\n[Am]Hello',
    );
  });

  it('appends a chord that stands past the end of its lyric', () => {
    expect(convertChordsAboveLyrics('C        G\nHello').chordPro).toBe('[C]Hello    [G]');
  });

  it('brackets a chord line with no lyric under it', () => {
    expect(convertChordsAboveLyrics('Am  G\n\nla').chordPro).toBe('[Am]  [G]\n\nla');
  });

  it('brackets a chord line followed by another chord line', () => {
    expect(convertChordsAboveLyrics('Am | G\nC\nsing').chordPro).toBe('[Am] | [G]\n[C]sing');
  });

  it('brackets a last line of chords', () => {
    expect(convertChordsAboveLyrics('la la\nAm').chordPro).toBe('la la\n[Am]');
  });

  it('turns a section label into a comment and keeps it out of the lyric', () => {
    expect(convertChordsAboveLyrics('[Chorus]\nG\n[Verse]').chordPro).toBe(
      '{comment: Chorus}\n[G]\n{comment: Verse}',
    );
  });

  it('keeps a bracketed chord on its own line as written', () => {
    expect(convertChordsAboveLyrics('[Am]').chordPro).toBe('[Am]');
  });

  it('expands tabs to the next tab stop before reading columns', () => {
    expect(convertChordsAboveLyrics('\tG\nabcdefghij').chordPro).toBe('abcdefgh[G]ij');
  });

  it('reads Windows line endings', () => {
    expect(convertChordsAboveLyrics('C\r\nla').chordPro).toBe('[C]la');
  });

  it('keeps a chart already in ChordPro as is', () => {
    const chordPro = "{title: Sunshine}\n[Am]Ain't no sunshine";
    expect(convertChordsAboveLyrics(chordPro)).toEqual({
      chordPro,
      hasChords: true,
      isChanged: false,
    });
  });

  it('keeps a text with no recognisable chord as text', () => {
    expect(convertChordsAboveLyrics('Just words\nand more words')).toEqual({
      chordPro: 'Just words\nand more words',
      hasChords: false,
      isChanged: false,
    });
  });
});

describe('describeChordChartAdded', () => {
  it('says whether the converter changed the text the chart came from', () => {
    expect(describeChordChartAdded('paste', 'G       C\nHello there')).toEqual({
      source: 'paste',
      converted: true,
    });
    expect(describeChordChartAdded('pdf', '[G]Hello there')).toEqual({
      source: 'pdf',
      converted: false,
    });
  });

  it('counts a chart kept as a file as not converted', () => {
    expect(describeChordChartAdded('photo', null)).toEqual({ source: 'photo', converted: false });
  });
});
