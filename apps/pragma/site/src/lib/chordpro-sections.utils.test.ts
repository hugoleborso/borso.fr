import { describe, expect, it } from 'vitest';
import {
  buildSectionHeading,
  type ChordProSection,
  groupChordProSections,
  hasSectionHeading,
} from './chordpro-sections.utils';
import { parseChordPro } from './chordpro.utils';

// @FollowsBlueprint test-pure-unit
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

function linesOfKind(source: string, kind: string): readonly string[][] {
  return groupChordProSections(parseChordPro(source))
    .filter((section) => section.kind === kind)
    .map((section) => section.lines.map((line) => line.kind));
}

describe('groupChordProSections, for a solo', () => {
  it('opens a solo on the explicit marker and keeps its label', () => {
    const sections = groupChordProSections(
      parseChordPro('{start_of_solo: Guitar}\n{comment: Hugo}\n[Am] [E]\n{end_of_solo}\nAfter'),
    );
    expect(sections.map((section) => section.kind)).toEqual(['solo', 'body']);
    expect(sections[0]?.label).toBe('Guitar');
    expect(sections[0]?.lines).toHaveLength(2);
  });

  it('opens a solo on a comment naming it, labelled by that comment', () => {
    const sections = groupChordProSections(parseChordPro('Intro\n{c: Outro Solo}\n[Dm] [C]'));
    expect(sections.map((section) => section.kind)).toEqual(['body', 'solo']);
    expect(sections[1]?.label).toBe('Outro Solo');
    expect(sections[1]?.lines).toHaveLength(1);
  });

  it('does not take a word holding solo, such as soloist, for a solo', () => {
    expect(kindsOf('{comment: soloist rests}\n[C]')).toEqual(['body']);
  });

  it('keeps the comments written right under the solo comment as its notes', () => {
    expect(linesOfKind('{comment: Solo}\n{comment: Hugo, 2 rounds}\n\n[Am] [E]', 'solo')).toEqual([
      ['directive', 'blank', 'chord-line'],
    ]);
  });

  it('ends the solo on the first directive after its rows', () => {
    expect(kindsOf('{comment: Solo}\n[Am]\n{comment: Verse 3}\n[C]Words')).toEqual([
      'solo',
      'body',
    ]);
    expect(kindsOf('{comment: Solo}\n[Am]\n{start_of_chorus}\n[C]Words\n{eoc}')).toEqual([
      'solo',
      'chorus',
    ]);
  });

  it('ends the solo on a section marker even before any row', () => {
    expect(kindsOf('{comment: Solo}\n{soc}\n[C]Words\n{eoc}')).toEqual(['solo', 'chorus']);
  });

  it('keeps chord rows split by blank lines inside the solo, and drops its trailing blanks', () => {
    expect(linesOfKind('{comment: Solo}\n\n| [C] [E7] |\n\n| [A] |\n\n{soc}', 'solo')).toEqual([
      ['blank', 'chord-line', 'blank', 'chord-line'],
    ]);
  });

  it('ends the solo on a lyric paragraph after a blank line', () => {
    const sections = groupChordProSections(
      parseChordPro('{comment: Solo}\n[Em] [Bm]\n\nOoh, you better stop\n[G]More words'),
    );
    expect(sections.map((section) => section.kind)).toEqual(['solo', 'body']);
    expect(sections[0]?.lines).toHaveLength(1);
    expect(sections[1]?.lines).toHaveLength(2);
  });

  it('keeps a lyric written in the first paragraph, which always belongs to the solo', () => {
    expect(kindsOf('{comment: Solo}\nCm7 Fm7 then the bridge chords\n(guitar)')).toEqual(['solo']);
  });

  it('opens a new solo right after one ends on a solo comment', () => {
    expect(kindsOf('{comment: Solo}\n[A]\n{comment: Solo}\n[B]')).toEqual(['solo', 'solo']);
  });

  it('leaves a solo comment inside a chorus as a line of that chorus', () => {
    expect(linesOfKind('{soc}\n{comment: Solo}\n[A]\n{eoc}', 'chorus')).toEqual([
      ['directive', 'chord-line'],
    ]);
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
