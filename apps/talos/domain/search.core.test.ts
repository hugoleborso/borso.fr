import { describe, expect, it } from 'vitest';
import { buildExcerpt, foldForSearch, listSearchTerms, rankSearchHits } from './search.core';

const LONG_PREFIX = 'x'.repeat(70);

const PAGES = [
  {
    path: 'second-brain/projets/seville',
    title: 'Vacances à Séville',
    body: '# Séville\nDu 16 au 26.',
  },
  {
    path: 'second-brain/personnes/marc-lefort',
    title: 'Marc Lefort',
    body: '# Marc\nTech Lead. Il part à Séville ? Non, séville est à toi.',
  },
  {
    path: 'second-brain/personnes/ines',
    title: 'Ines',
    body: '# Ines\nA conseillé Séville.',
  },
  { path: 'second-brain/domaines/seville-guide', title: 'Séville, le guide', body: '' },
  { path: 'second-brain/domaines/sport', title: 'Sport', body: 'Rien à voir.' },
];

describe('foldForSearch', () => {
  it('lowercases and strips accents while keeping the length', () => {
    expect(foldForSearch('Échéance ÇA')).toBe('echeance ca');
  });

  it('keeps a character whose decomposition would change the length', () => {
    expect(foldForSearch('한글')).toBe('한글');
  });
});

describe('listSearchTerms', () => {
  it('splits a folded query on whitespace', () => {
    expect(listSearchTerms('  Tech   Lead ')).toEqual(['tech', 'lead']);
  });
});

describe('buildExcerpt', () => {
  it('surrounds the first match with context and ellipses', () => {
    const body = `${LONG_PREFIX} Séville ${LONG_PREFIX}`;
    expect(buildExcerpt(body, ['seville'])).toBe(`…${'x'.repeat(59)} Séville ${'x'.repeat(59)}…`);
  });

  it('adds no ellipsis when the match sits near both ends', () => {
    expect(buildExcerpt('  Le\n\nguide   de Séville \n', ['seville'])).toBe('Le guide de Séville');
  });

  it('falls back to the first line of text when the body does not match', () => {
    expect(buildExcerpt('---\n# Titre\n\n  Première ligne.  \nSuite', ['absent'])).toBe(
      'Première ligne.',
    );
  });

  it('cuts a long first line', () => {
    expect(buildExcerpt('y'.repeat(130), ['absent'])).toBe(`${'y'.repeat(120)}…`);
  });

  it('keeps a first line exactly as long as the limit', () => {
    expect(buildExcerpt('y'.repeat(120), ['absent'])).toBe('y'.repeat(120));
  });

  it('answers an empty excerpt for an empty page', () => {
    expect(buildExcerpt('', ['absent'])).toBe('');
  });
});

describe('rankSearchHits', () => {
  it('ranks title matches first, title prefixes before them, then content by occurrences', () => {
    expect(rankSearchHits(PAGES, 'seville', 20).map((hit) => hit.path)).toEqual([
      'second-brain/domaines/seville-guide',
      'second-brain/projets/seville',
      'second-brain/personnes/marc-lefort',
      'second-brain/personnes/ines',
    ]);
  });

  it('counts a title starting with any of the terms as a prefix match', () => {
    const titled = [
      { path: 'a', title: 'Le guide de Séville', body: '' },
      { path: 'b', title: 'Séville, le guide', body: '' },
    ];
    expect(rankSearchHits(titled, 'guide séville', 20).map((hit) => hit.path)).toEqual(['b', 'a']);
  });

  it('breaks ties on the path', () => {
    const tied = [
      { path: 'b', title: 'Note', body: 'pomme' },
      { path: 'a', title: 'Note', body: 'pomme' },
    ];
    expect(rankSearchHits(tied, 'pomme', 20).map((hit) => hit.path)).toEqual(['a', 'b']);
  });

  it('requires every term to appear', () => {
    expect(rankSearchHits(PAGES, 'tech séville', 20).map((hit) => hit.path)).toEqual([
      'second-brain/personnes/marc-lefort',
    ]);
  });

  it('answers the title and an excerpt for each hit', () => {
    expect(rankSearchHits(PAGES, 'ines', 20)).toEqual([
      {
        path: 'second-brain/personnes/ines',
        title: 'Ines',
        excerpt: '# Ines\nA conseillé Séville.'.replace('\n', ' '),
      },
    ]);
  });

  it('stops at the limit', () => {
    expect(rankSearchHits(PAGES, 'séville', 2)).toHaveLength(2);
  });

  it('answers nothing for a blank query', () => {
    expect(rankSearchHits(PAGES, '   ', 20)).toEqual([]);
  });
});
