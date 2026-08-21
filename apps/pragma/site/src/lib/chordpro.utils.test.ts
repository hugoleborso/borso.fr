import { describe, expect, it } from 'vitest';
import {
  buildSectionHeading,
  type ChordProSection,
  directiveLines,
  isTitleDirective,
  groupChordProSections,
  hasSectionHeading,
  parseChordPro,
  parseChordProLine,
  readTitle,
  transposeChord,
  transposeLines,
} from './chordpro.utils';

// @FollowsBlueprint test-pure-unit
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

  it('parses a directive padded with whitespace', () => {
    expect(parseChordProLine('  {title: Take Five}  ')).toEqual({
      kind: 'directive',
      name: 'title',
      value: 'Take Five',
    });
  });

  it('emits no trailing lyric token when the line ends on a chord', () => {
    expect(parseChordProLine('Hello [C]')).toEqual({
      kind: 'chord-line',
      tokens: [
        { kind: 'lyric', text: 'Hello ' },
        { kind: 'chord', chord: 'C' },
      ],
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

describe('isTitleDirective', () => {
  it('accepts both spellings of the title directive', () => {
    expect(isTitleDirective('title')).toBe(true);
    expect(isTitleDirective('t')).toBe(true);
  });

  it('rejects every other directive', () => {
    expect(isTitleDirective('comment')).toBe(false);
    expect(isTitleDirective('')).toBe(false);
  });
});

describe('directiveLines', () => {
  it('keeps only the directive lines, in source order', () => {
    const lines = parseChordPro('{title: My Song}\n[C]Hi\nplain\n\n{key: C}');
    expect(directiveLines(lines)).toEqual([
      { kind: 'directive', name: 'title', value: 'My Song' },
      { kind: 'directive', name: 'key', value: 'C' },
    ]);
  });

  it('answers an empty list for a chart without directives', () => {
    expect(directiveLines(parseChordPro('[C]Hi'))).toEqual([]);
  });
});

describe('readTitle', () => {
  it('skips the directives that are not a title', () => {
    const lines = parseChordPro('{key: C}\n{title: My Song}');
    expect(readTitle(lines)).toBe('My Song');
  });

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

  it('leaves an enharmonic spelling absent from the twelve-tone tables untouched', () => {
    const spellingsNeitherTableLists = [
      { chord: 'Cb', semitones: 1 },
      { chord: 'Fbm7', semitones: 3 },
      { chord: 'E#', semitones: 1 },
      { chord: 'B#sus4', semitones: 2 },
    ];
    for (const { chord, semitones } of spellingsNeitherTableLists) {
      expect(transposeChord(chord, semitones)).toBe(chord);
    }
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

  it('shifts the key directive spelled in full', () => {
    const shifted = transposeLines(parseChordPro('{key: Am}'), 3);
    expect(shifted[0]).toEqual({ kind: 'directive', name: 'key', value: 'Cm' });
  });

  it('shifts the key directive spelled abbreviated', () => {
    const shifted = transposeLines(parseChordPro('{k: Am}'), 3);
    expect(shifted[0]).toEqual({ kind: 'directive', name: 'k', value: 'Cm' });
  });

  it('leaves a directive that is not a key at its written value', () => {
    const shifted = transposeLines(parseChordPro('{comment: A word}'), 3);
    expect(shifted[0]).toEqual({ kind: 'directive', name: 'comment', value: 'A word' });
  });
});

const kindsOf = (source: string): readonly string[] =>
  groupChordProSections(parseChordPro(source)).map((section) => section.kind);

describe('groupChordProSections', () => {
  it('returns no section for an empty chart', () => {
    expect(groupChordProSections([])).toEqual([]);
  });

  it('collects lines written outside any marker into a body section', () => {
    const sections = groupChordProSections(parseChordPro('[C]Hello'));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.kind).toBe('body');
    expect(sections[0]?.ordinalAmongKind).toBeNull();
    expect(sections[0]?.label).toBeNull();
    expect(sections[0]?.lines).toHaveLength(1);
  });

  it('drops a body section holding nothing but blank lines', () => {
    expect(kindsOf('\n\n')).toEqual([]);
  });

  it('keeps a body section as soon as one line is not blank', () => {
    expect(kindsOf('\nPlain\n')).toEqual(['body']);
  });

  it('opens a verse on the full marker and closes it on the full end marker', () => {
    const sections = groupChordProSections(
      parseChordPro('{start_of_verse}\n[C]Line\n{end_of_verse}'),
    );
    expect(sections).toHaveLength(1);
    expect(sections[0]?.kind).toBe('verse');
    expect(sections[0]?.ordinalAmongKind).toBe(1);
    expect(sections[0]?.lines).toHaveLength(1);
  });

  it('opens each section kind on its abbreviated marker', () => {
    expect(kindsOf('{sov}\nA\n{eov}\n{soc}\nB\n{eoc}')).toEqual(['verse', 'chorus']);
    expect(kindsOf('{sob}\nA\n{eob}\n{sot}\nB\n{eot}')).toEqual(['bridge', 'tab']);
  });

  it('numbers the sections of one kind independently of the other kinds', () => {
    const sections = groupChordProSections(
      parseChordPro('{sov}\nA\n{eov}\n{soc}\nB\n{eoc}\n{sov}\nC\n{eov}\n{soc}\nD\n{eoc}'),
    );
    expect(sections.map((section) => `${section.kind}${section.ordinalAmongKind ?? ''}`)).toEqual([
      'verse1',
      'chorus1',
      'verse2',
      'chorus2',
    ]);
  });

  it('reads the marker argument as the section label', () => {
    const sections = groupChordProSections(parseChordPro('{start_of_verse: Intro riff}\nA\n{eov}'));
    expect(sections[0]?.label).toBe('Intro riff');
  });

  it('leaves the label null when the marker carries no argument', () => {
    const sections = groupChordProSections(parseChordPro('{sov}\nA\n{eov}'));
    expect(sections[0]?.label).toBeNull();
  });

  it('keeps an empty marked section, unlike an empty body section', () => {
    const sections = groupChordProSections(parseChordPro('{soc}\n{eoc}'));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.kind).toBe('chorus');
    expect(sections[0]?.lines).toEqual([]);
  });

  it('returns a section left unclosed at the end of the source', () => {
    const sections = groupChordProSections(parseChordPro('{soc}\n[G]Never closed'));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.kind).toBe('chorus');
    expect(sections[0]?.lines).toHaveLength(1);
  });

  it('closes the running section when a new marker opens without an end marker', () => {
    expect(kindsOf('{sov}\nA\n{soc}\nB')).toEqual(['verse', 'chorus']);
  });

  it('ignores an end marker that closes nothing', () => {
    expect(kindsOf('{eoc}')).toEqual([]);
  });

  it('splits the body around a marked section', () => {
    expect(kindsOf('Before\n{soc}\nIn\n{eoc}\nAfter')).toEqual(['body', 'chorus', 'body']);
  });

  it('keeps a directive that marks no section as a line of its section', () => {
    const sections = groupChordProSections(parseChordPro('{soc}\n{comment: soft}\n{eoc}'));
    expect(sections[0]?.lines).toEqual([{ kind: 'directive', name: 'comment', value: 'soft' }]);
  });
});

describe('buildSectionHeading', () => {
  it('leaves the first block of a kind unnumbered', () => {
    expect(buildSectionHeading('Chorus', 1)).toBe('Chorus');
  });

  it('appends the rank from the second block of a kind onwards', () => {
    expect(buildSectionHeading('Verse', 2)).toBe('Verse 2');
    expect(buildSectionHeading('Verse', 3)).toBe('Verse 3');
  });

  it('treats a rank below the first as unnumbered', () => {
    expect(buildSectionHeading('Chorus', 0)).toBe('Chorus');
  });
});

const sectionOf = (source: string): ChordProSection => {
  const [section] = groupChordProSections(parseChordPro(source));
  if (section === undefined) throw new Error(`no section parsed from ${source}`);
  return section;
};

describe('hasSectionHeading', () => {
  it('reports a heading for every marked section kind', () => {
    expect(hasSectionHeading(sectionOf('{sov}\nA\n{eov}'))).toBe(true);
    expect(hasSectionHeading(sectionOf('{soc}\nA\n{eoc}'))).toBe(true);
    expect(hasSectionHeading(sectionOf('{sob}\nA\n{eob}'))).toBe(true);
    expect(hasSectionHeading(sectionOf('{sot}\nA\n{eot}'))).toBe(true);
  });

  it('reports no heading for an unmarked body run', () => {
    expect(hasSectionHeading(sectionOf('Plain line'))).toBe(false);
  });
});
