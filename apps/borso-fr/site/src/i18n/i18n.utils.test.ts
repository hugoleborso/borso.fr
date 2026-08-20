import { describe, expect, it } from 'vitest';
import { compareTranslationKeys, DEFAULT_LANGUAGE, listTranslationKeys } from './i18n.utils';

// @FollowsBlueprint test-pure-unit
describe('DEFAULT_LANGUAGE', () => {
  it('is French, which is the only language this site renders', () => {
    expect(DEFAULT_LANGUAGE).toBe('fr');
  });
});

describe('compareTranslationKeys', () => {
  it('orders an earlier key before a later one', () => {
    expect(compareTranslationKeys('apple', 'zebra')).toBeLessThan(0);
  });

  it('orders a later key after an earlier one', () => {
    expect(compareTranslationKeys('zebra', 'apple')).toBeGreaterThan(0);
  });

  it('treats a key as equal to itself', () => {
    expect(compareTranslationKeys('apple', 'apple')).toBe(0);
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
