import { describe, expect, it } from 'vitest';
import { isPageLate, orderLatePages, selectLatePageCount, splitTitleLine } from './late-pages.core';

const PAGES = [
  { slug: 'second-brain/personnes/alice-martin', lateness: 12 },
  { slug: 'second-brain/projets/serre', lateness: 48 },
  { slug: 'second-brain/projets/potager', lateness: 30 },
];

describe('orderLatePages', () => {
  it('puts the most late page first, without touching its input', () => {
    expect(orderLatePages(PAGES).map((page) => page.slug)).toStrictEqual([
      'second-brain/projets/serre',
      'second-brain/projets/potager',
      'second-brain/personnes/alice-martin',
    ]);
    expect(PAGES[0]?.lateness).toBe(12);
  });
});

describe('selectLatePageCount', () => {
  it('answers the count of the state, and none until the state is loaded', () => {
    expect(selectLatePageCount({ lateCount: 67 })).toBe(67);
    expect(selectLatePageCount({ lateCount: 0 })).toBe(0);
    expect(selectLatePageCount(undefined)).toBeUndefined();
  });
});

describe('isPageLate', () => {
  it('says whether the page is among the late pages of the state', () => {
    expect(isPageLate(PAGES, 'second-brain/projets/serre')).toBe(true);
    expect(isPageLate(PAGES, 'second-brain/projets/compost')).toBe(false);
    expect(isPageLate([], 'second-brain/projets/serre')).toBe(false);
    expect(isPageLate(undefined, 'second-brain/projets/serre')).toBe(false);
  });
});

describe('splitTitleLine', () => {
  it('separates the first-level heading that opens a page from the rest', () => {
    expect(splitTitleLine('# Jardin\n\n## En bref\n')).toStrictEqual({
      title: '# Jardin',
      rest: '\n## En bref\n',
    });
    expect(splitTitleLine('# Jardin')).toStrictEqual({ title: '# Jardin', rest: '' });
  });

  it('finds no title when the page opens on anything else', () => {
    expect(splitTitleLine('Texte\n# Jardin')).toStrictEqual({ title: '', rest: 'Texte\n# Jardin' });
    expect(splitTitleLine('## En bref\n')).toStrictEqual({ title: '', rest: '## En bref\n' });
    expect(splitTitleLine('')).toStrictEqual({ title: '', rest: '' });
  });
});
