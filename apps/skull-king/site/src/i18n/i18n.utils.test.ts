import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, detectInitialLocale, isSupportedLocale } from './i18n.utils';

// @FollowsBlueprint test-pure-unit
describe('isSupportedLocale', () => {
  it('recognises the locales the game ships', () => {
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSupportedLocale('de')).toBe(false);
  });
});

describe('detectInitialLocale', () => {
  it('reads the base language out of a regional tag', () => {
    expect(detectInitialLocale('en-GB')).toBe('en');
  });

  it('takes a plain language tag as it stands', () => {
    expect(detectInitialLocale('fr')).toBe('fr');
  });

  it('falls back for a language the game does not speak', () => {
    expect(detectInitialLocale('de-DE')).toBe(DEFAULT_LOCALE);
  });

  it('falls back when the browser says nothing', () => {
    expect(detectInitialLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('falls back for an empty tag', () => {
    expect(detectInitialLocale('')).toBe(DEFAULT_LOCALE);
  });
});
