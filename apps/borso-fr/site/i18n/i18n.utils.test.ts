import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, listTranslationKeys } from './i18n.utils';

describe('DEFAULT_LANGUAGE', () => {
  it('is French, which is the only language this site renders', () => {
    expect(DEFAULT_LANGUAGE).toBe('fr');
  });
});

describe('listTranslationKeys', () => {
  it('returns the dotted path of every leaf, sorted', () => {
    expect(listTranslationKeys({ page: { title: 'Title', body: 'Body' }, name: 'Name' })).toEqual([
      'name',
      'page.body',
      'page.title',
    ]);
  });

  it('walks nesting of any depth', () => {
    expect(listTranslationKeys({ one: { two: { three: 'deep' } } })).toEqual(['one.two.three']);
  });

  it('returns nothing for an empty catalogue', () => {
    expect(listTranslationKeys({})).toEqual([]);
  });
});
