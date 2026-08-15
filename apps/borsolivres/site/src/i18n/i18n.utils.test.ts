import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, flattenKeys, selectInitialLocale } from './i18n.utils';

// @FollowsBlueprint test-pure-unit
describe('flattenKeys', () => {
  it('walks a nested catalogue into sorted dotted paths', () => {
    expect(flattenKeys({ page: { title: 'A', subtitle: 'B' }, common: { save: 'C' } })).toEqual([
      'common.save',
      'page.subtitle',
      'page.title',
    ]);
  });

  it('reads a top-level string as a key of its own', () => {
    expect(flattenKeys({ solo: 'A' })).toEqual(['solo']);
  });

  it('reads an empty catalogue as no keys', () => {
    expect(flattenKeys({})).toEqual([]);
  });

  it('descends more than one level', () => {
    expect(flattenKeys({ one: { two: { three: 'deep' } } })).toEqual(['one.two.three']);
  });
});

describe('selectInitialLocale', () => {
  it('prefers the saved choice over the browser language', () => {
    expect(selectInitialLocale('en', 'fr-FR')).toBe('en');
  });

  it('reads the family of the browser language when nothing was saved', () => {
    expect(selectInitialLocale(null, 'en-GB')).toBe('en');
  });

  it('falls back to French for a language the application does not carry', () => {
    expect(selectInitialLocale(null, 'de-DE')).toBe(DEFAULT_LOCALE);
  });

  it('falls back to French when the browser names no language', () => {
    expect(selectInitialLocale(null, undefined)).toBe(DEFAULT_LOCALE);
  });

  it('reads a language tag with no region', () => {
    expect(selectInitialLocale(null, 'EN')).toBe('en');
  });
});
