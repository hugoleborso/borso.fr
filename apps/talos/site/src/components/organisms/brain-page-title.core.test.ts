import { describe, expect, it } from 'vitest';
import { splitTitleLine } from './brain-page-title.core';

describe('splitTitleLine', () => {
  it('separates the first-level heading that opens a page from the rest', () => {
    expect(splitTitleLine('# Jardin\n\n## En bref\n')).toStrictEqual({
      title: '# Jardin',
      rest: '\n## En bref\n',
    });
    expect(splitTitleLine('# Jardin')).toStrictEqual({ title: '# Jardin', rest: '' });
  });

  it('finds the title below blank lines, and leaves them out of the rest', () => {
    expect(splitTitleLine('\n# Jardin\n\ntexte')).toStrictEqual({
      title: '# Jardin',
      rest: '\ntexte',
    });
    expect(splitTitleLine('\n  \n\n# Jardin')).toStrictEqual({ title: '# Jardin', rest: '' });
  });

  it('finds no title when the page opens on anything else, and keeps the page as written', () => {
    expect(splitTitleLine('Texte\n# Jardin')).toStrictEqual({ title: '', rest: 'Texte\n# Jardin' });
    expect(splitTitleLine('\n## En bref\n')).toStrictEqual({ title: '', rest: '\n## En bref\n' });
    expect(splitTitleLine('')).toStrictEqual({ title: '', rest: '' });
  });
});
