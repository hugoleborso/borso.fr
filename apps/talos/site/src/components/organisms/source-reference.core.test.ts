import { describe, expect, it } from 'vitest';
import { classifySource, readSourceList } from './source-reference.core';

describe('classifySource', () => {
  it('reads a web address as a link', () => {
    expect(classifySource(' https://www.notion.so/page-123 ')).toEqual({
      kind: 'link',
      href: 'https://www.notion.so/page-123',
    });
    expect(classifySource('HTTP://exemple.fr')).toEqual({
      kind: 'link',
      href: 'HTTP://exemple.fr',
    });
  });

  it('reads a path of the repository as a page, with or without its extension or brackets', () => {
    expect(classifySource('sources/2026/10/02/appel.md')).toEqual({
      kind: 'page',
      path: 'sources/2026/10/02/appel',
    });
    expect(classifySource('[[engagements/devis]]')).toEqual({
      kind: 'page',
      path: 'engagements/devis',
    });
  });

  it('keeps anything else, such as a mail identifier, as text', () => {
    expect(classifySource('gmail perso 19c56c593c4f42c8')).toEqual({
      kind: 'text',
      text: 'gmail perso 19c56c593c4f42c8',
    });
    expect(classifySource('19c56c593c4f42c8')).toEqual({ kind: 'text', text: '19c56c593c4f42c8' });
    expect(classifySource('https://deux mots')).toEqual({
      kind: 'text',
      text: 'https://deux mots',
    });
  });
});

describe('readSourceList', () => {
  it('reads a list of quoted or bare items', () => {
    expect(readSourceList('["sources/a.md", \'gmail 1a\', https://x.fr/a ]')).toEqual([
      'sources/a.md',
      'gmail 1a',
      'https://x.fr/a',
    ]);
  });

  it('keeps a comma inside quotes', () => {
    expect(readSourceList('["a, b", c]')).toEqual(['a, b', 'c']);
  });

  it('reads a list surrounded by blanks', () => {
    expect(readSourceList(' ["a"] ')).toEqual(['a']);
  });

  it('reads a single value written without brackets', () => {
    expect(readSourceList('sources/a.md')).toEqual(['sources/a.md']);
  });

  it('answers an empty list for nothing, an empty list or blank items', () => {
    expect(readSourceList(undefined)).toEqual([]);
    expect(readSourceList(' ')).toEqual([]);
    expect(readSourceList('[]')).toEqual([]);
    expect(readSourceList('["", , " "]')).toEqual([]);
  });
});
