import { describe, expect, it } from 'vitest';
import { formatFrontMatterValue, selectFrontMatterEntries } from './front-matter-chips.core';

function translate(key: string): string {
  return `<${key}>`;
}

describe('formatFrontMatterValue', () => {
  it('keeps a plain value', () => {
    expect(formatFrontMatterValue('organisation')).toBe('organisation');
    expect(formatFrontMatterValue(' 2026-10-02 ')).toBe('2026-10-02');
  });

  it('turns a list of wikilinks into page names', () => {
    expect(
      formatFrontMatterValue('["[[second-brain/domaines/carriere]]", "[[second-brain/moi]]"]'),
    ).toBe('carriere, moi');
  });

  it('turns quoted paths into their file names', () => {
    expect(formatFrontMatterValue("['sources/2026/10/02/moi-reponses.md']")).toBe('moi-reponses');
  });

  it('skips the empty items of a list', () => {
    expect(formatFrontMatterValue('[a, , b]')).toBe('a, b');
  });

  it('answers an empty string for an empty list', () => {
    expect(formatFrontMatterValue('[]')).toBe('');
  });
});

describe('selectFrontMatterEntries', () => {
  it('formats every entry and drops the empty ones', () => {
    expect(
      selectFrontMatterEntries(
        { type: 'organisation', personnes: '[]', projets: '[[a/b]]' },
        translate,
      ),
    ).toEqual([
      ['type', 'organisation'],
      ['projets', 'b'],
    ]);
  });

  it.each(['0', '1', '2', '3', '4', '5'])(
    'names the closeness %s of a person after its number',
    (level) => {
      expect(
        selectFrontMatterEntries({ type: 'personne', proximite: level, maj: '4' }, translate),
      ).toStrictEqual([
        ['type', 'personne'],
        ['proximite', `${level} · <closeness.name.person.${level}>`],
        ['maj', '4'],
      ]);
    },
  );

  it.each(['0', '1', '2', '3', '4', '5'])(
    'names the closeness %s of any other kind, and of a page with no type, in the other set',
    (level) => {
      const named = `${level} · <closeness.name.other.${level}>`;
      expect(selectFrontMatterEntries({ type: 'domaine', proximite: level }, translate)).toEqual([
        ['type', 'domaine'],
        ['proximite', named],
      ]);
      expect(
        selectFrontMatterEntries({ proximite: level, type: 'organisation' }, translate),
      ).toEqual([
        ['proximite', named],
        ['type', 'organisation'],
      ]);
      expect(selectFrontMatterEntries({ proximite: level }, translate)).toEqual([
        ['proximite', named],
      ]);
    },
  );

  it('reads the kind off the type entry alone, not off another key or value', () => {
    expect(selectFrontMatterEntries({ personne: 'type', proximite: '4' }, translate)).toEqual([
      ['personne', 'type'],
      ['proximite', '4 · <closeness.name.other.4>'],
    ]);
    expect(selectFrontMatterEntries({ sujet: 'personne', proximite: '4' }, translate)).toEqual([
      ['sujet', 'personne'],
      ['proximite', '4 · <closeness.name.other.4>'],
    ]);
  });

  it.each(['6', '2.5', '-1'])(
    'shows the closeness %s as a number alone, whatever the kind',
    (level) => {
      expect(selectFrontMatterEntries({ proximite: level, type: 'personne' }, translate)).toEqual([
        ['proximite', level],
        ['type', 'personne'],
      ]);
      expect(selectFrontMatterEntries({ type: 'domaine', proximite: level }, translate)).toEqual([
        ['type', 'domaine'],
        ['proximite', level],
      ]);
    },
  );
});
