import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, detectInitialLocale, flattenKeys } from './i18n.utils';

describe('i18n.utils', () => {
  describe('constants', () => {
    it('exposes the supported locales', () => {
      expect(SUPPORTED_LOCALES).toEqual(['fr', 'en']);
    });

    it('defaults to fr', () => {
      expect(DEFAULT_LOCALE).toBe('fr');
    });
  });

  describe('flattenKeys', () => {
    it('returns sorted dotted leaf paths', () => {
      expect(flattenKeys({ a: 'A', b: { c: 'C', d: 'D' } })).toEqual(['a', 'b.c', 'b.d']);
    });

    it('handles a deeply nested catalog', () => {
      expect(flattenKeys({ a: { b: { c: 'leaf' } } })).toEqual(['a.b.c']);
    });

    it('returns an empty list for an empty catalog', () => {
      expect(flattenKeys({})).toEqual([]);
    });

    it('sorts keys deterministically', () => {
      expect(flattenKeys({ z: 'z', a: 'a' })).toEqual(['a', 'z']);
    });
  });

  describe('detectInitialLocale', () => {
    it('returns the default when the navigator language is undefined', () => {
      expect(detectInitialLocale(undefined)).toBe('fr');
    });

    it('returns the default for an empty string', () => {
      expect(detectInitialLocale('')).toBe('fr');
    });

    it('returns fr for fr-FR', () => {
      expect(detectInitialLocale('fr-FR')).toBe('fr');
    });

    it('returns en for en-GB', () => {
      expect(detectInitialLocale('en-GB')).toBe('en');
    });

    it('falls back to the default for an unsupported language', () => {
      expect(detectInitialLocale('de-DE')).toBe('fr');
    });
  });
});
