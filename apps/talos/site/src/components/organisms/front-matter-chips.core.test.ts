import { describe, expect, it } from 'vitest';
import { formatFrontMatterValue, selectFrontMatterEntries } from './front-matter-chips.core';

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
      selectFrontMatterEntries({ type: 'organisation', personnes: '[]', projets: '[[a/b]]' }),
    ).toEqual([
      ['type', 'organisation'],
      ['projets', 'b'],
    ]);
  });
});
