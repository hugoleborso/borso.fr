import { describe, expect, it } from 'vitest';
import {
  FALLBACK_LANGUAGE,
  isSupportedLanguage,
  listTranslationKeys,
  readLanguageFamily,
  selectInitialLanguage,
  SUPPORTED_LANGUAGES,
} from './i18n.utils';

describe('listTranslationKeys', () => {
  it('returns an empty list for an empty catalogue', () => {
    expect(listTranslationKeys({})).toEqual([]);
  });

  it('returns leaf keys as sorted dotted paths', () => {
    const keys = listTranslationKeys({
      selection: { side: { white: 'White', black: 'Black' } },
      common: { action: { back: 'Back' } },
    });
    expect(keys).toEqual(['common.action.back', 'selection.side.black', 'selection.side.white']);
  });

  it('keeps a top level string at the root of the path', () => {
    expect(listTranslationKeys({ brand: 'Borsouvertures' })).toEqual(['brand']);
  });
});

describe('isSupportedLanguage', () => {
  it('accepts every language the application ships', () => {
    expect(SUPPORTED_LANGUAGES.every((language) => isSupportedLanguage(language))).toBe(true);
  });

  it('rejects a language the application does not ship', () => {
    expect(isSupportedLanguage('de')).toBe(false);
  });
});

describe('readLanguageFamily', () => {
  it('returns the tag itself when it carries no region', () => {
    expect(readLanguageFamily('FR')).toBe('fr');
  });

  it('drops the region subtag', () => {
    expect(readLanguageFamily('fr-CA')).toBe('fr');
  });
});

describe('selectInitialLanguage', () => {
  it('prefers the saved language over the browser languages', () => {
    expect(selectInitialLanguage('fr', ['en-GB'])).toBe('fr');
  });

  it('ignores a saved language the application does not ship', () => {
    expect(selectInitialLanguage('de', ['fr-FR'])).toBe('fr');
  });

  it('falls back to the browser languages when nothing is saved', () => {
    expect(selectInitialLanguage(null, ['fr-FR', 'en-US'])).toBe('fr');
  });

  it('skips browser languages the application does not ship', () => {
    expect(selectInitialLanguage(null, ['de-DE', 'fr'])).toBe('fr');
  });

  it('falls back to English when no browser language matches', () => {
    expect(selectInitialLanguage(null, ['de-DE'])).toBe(FALLBACK_LANGUAGE);
  });

  it('falls back to English when the browser reports no language', () => {
    expect(selectInitialLanguage(null, [])).toBe('en');
  });
});
