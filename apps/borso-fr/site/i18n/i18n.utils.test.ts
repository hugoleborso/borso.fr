import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  listTranslationKeys,
  readLanguageFamily,
  selectInitialLanguage,
  SUPPORTED_LANGUAGES,
} from './i18n.utils';

describe('isSupportedLanguage', () => {
  it('accepts every language the catalogues ship', () => {
    expect(SUPPORTED_LANGUAGES.every((language) => isSupportedLanguage(language))).toBe(true);
  });

  it('rejects a language with no catalogue', () => {
    expect(isSupportedLanguage('de')).toBe(false);
  });
});

describe('readLanguageFamily', () => {
  it('keeps a bare tag and lowercases it', () => {
    expect(readLanguageFamily('FR')).toBe('fr');
  });

  it('drops the region subtag', () => {
    expect(readLanguageFamily('en-GB')).toBe('en');
  });

  it('drops every subtag after the first separator', () => {
    expect(readLanguageFamily('zh-Hans-CN')).toBe('zh');
  });
});

describe('selectInitialLanguage', () => {
  it('prefers the saved choice over the browser languages', () => {
    expect(selectInitialLanguage('en', ['fr-FR'])).toBe('en');
  });

  it('ignores a saved value that names no supported language', () => {
    expect(selectInitialLanguage('de', ['en-GB'])).toBe('en');
  });

  it('falls back to the browser languages when nothing is saved', () => {
    expect(selectInitialLanguage(null, ['en-US', 'fr'])).toBe('en');
  });

  it('skips browser languages the catalogues do not cover', () => {
    expect(selectInitialLanguage(null, ['de-DE', 'it', 'fr-CA'])).toBe('fr');
  });

  it('falls back to the default when no browser language matches', () => {
    expect(selectInitialLanguage(null, ['de-DE'])).toBe(DEFAULT_LANGUAGE);
  });

  it('falls back to the default when the browser lists nothing', () => {
    expect(selectInitialLanguage(null, [])).toBe(DEFAULT_LANGUAGE);
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
