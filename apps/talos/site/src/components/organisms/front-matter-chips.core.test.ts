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
        ['proximite', `${level} · <closeness.name.${level}>`],
        ['maj', '4'],
      ]);
    },
  );

  it.each(['6', '2.5', '-1'])('shows the closeness %s of a person as a number alone', (level) => {
    expect(selectFrontMatterEntries({ proximite: level, type: 'personne' }, translate)).toEqual([
      ['proximite', level],
      ['type', 'personne'],
    ]);
  });

  it('leaves the closeness of any other kind, and of a page with no type, unchanged', () => {
    expect(selectFrontMatterEntries({ type: 'domaine', proximite: '4' }, translate)).toEqual([
      ['type', 'domaine'],
      ['proximite', '4'],
    ]);
    expect(selectFrontMatterEntries({ proximite: '4' }, translate)).toEqual([['proximite', '4']]);
    expect(selectFrontMatterEntries({ personne: 'type', proximite: '4' }, translate)).toEqual([
      ['personne', 'type'],
      ['proximite', '4'],
    ]);
    expect(selectFrontMatterEntries({ sujet: 'personne', proximite: '4' }, translate)).toEqual([
      ['sujet', 'personne'],
      ['proximite', '4'],
    ]);
  });
});
