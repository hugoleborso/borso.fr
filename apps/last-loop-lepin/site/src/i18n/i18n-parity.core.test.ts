import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { diffCatalogues, isInParity, listIdenticalValueKeys } from './i18n-parity.core';

/**
 * An English string sitting untouched in `fr.json` is a missed translation, not
 * a design choice. The only exceptions are the entries below, which read the
 * same in both languages. Adding a key here is a claim a reviewer can check
 * against the comment next to it.
 */
const KEYS_IDENTICAL_IN_BOTH_LANGUAGES: readonly string[] = [
  'admin.corrections.title', // same word, same spelling
  'admin.pin-label', // the PIN acronym
  'admin.setup.edition-summary', // "{{name}} · {{status}}" — two placeholders
  'admin.setup.gpx-file-summary', // "{{name}} ({{kilobytes}} kB)" — an SI-style unit symbol
  'admin.setup.slug', // "slug" is the word used in French too
  'admin.tab.corrections', // same word, same spelling
  'admin.title', // "admin" is the same short form in French
  'archives.summary', // "{{distance}} · {{elevation}}" — two placeholders
  'archives.title', // same word, same spelling
  'common.distance', // "{{kilometres}} km" — an SI unit symbol
  'common.empty-value', // an em dash, not a word
  'common.error-detail', // a bare placeholder
  'course-map.summary', // "{{distance}} · {{elevation}}" — two placeholders
  'nav.admin', // "admin" is the same short form in French
  'nav.archives', // same word, same spelling
  'nav.brand', // the Last Loop Lépin brand
  'nav.edition-year', // a year
  'nav.language-english', // the English endonym, shown in both locales
  'nav.language-french', // the French endonym, shown in both locales
  'runner-profile.loop-duration', // "Δ {{duration}}" — a symbol and a placeholder
  'spectator.archives-title', // same word, same spelling
  'spectator.live', // "live" is the word used in French race coverage too
  'spectator.location', // the commune of Lépin-le-Lac
  'spectator.next-edition-title', // the Last Loop Lépin brand
];

describe('diffCatalogues', () => {
  it('finds the shipped catalogues in parity', () => {
    const diff = diffCatalogues(english, french);
    expect(diff).toEqual({ missingInEnglish: [], missingInFrench: [] });
    expect(isInParity(diff)).toBe(true);
  });

  it('reports a key present only in the French catalogue', () => {
    const diff = diffCatalogues({ shared: 'a' }, { shared: 'a', extra: 'b' });
    expect(diff).toEqual({ missingInEnglish: ['extra'], missingInFrench: [] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports a key present only in the English catalogue', () => {
    const diff = diffCatalogues({ shared: 'a', extra: 'b' }, { shared: 'a' });
    expect(diff).toEqual({ missingInEnglish: [], missingInFrench: ['extra'] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports both directions, each sorted', () => {
    const diff = diffCatalogues({ shared: 'a', zeta: 'z', alpha: 'a' }, { shared: 'a', beta: 'b' });
    expect(diff).toEqual({ missingInEnglish: ['beta'], missingInFrench: ['alpha', 'zeta'] });
    expect(isInParity(diff)).toBe(false);
  });
});

describe('listIdenticalValueKeys', () => {
  it('leaves the shipped catalogues with only the deliberately identical entries', () => {
    expect(listIdenticalValueKeys(english, french)).toEqual(KEYS_IDENTICAL_IN_BOTH_LANGUAGES);
  });

  it('reports a nested key whose French value was copied from the English one', () => {
    const englishCatalogue = { page: { kept: 'Archives', copied: 'Setup' } };
    const frenchCatalogue = { page: { kept: 'Archives', copied: 'Setup' } };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([
      'page.copied',
      'page.kept',
    ]);
  });

  it('ignores a key the French catalogue translates, and one it does not carry at all', () => {
    const englishCatalogue = { translated: 'Setup', orphan: 'Runners' };
    const frenchCatalogue = { translated: 'Configuration' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });

  it('ignores a branch the French catalogue does not carry at all', () => {
    const englishCatalogue = { branch: { leaf: 'Setup' } };
    const frenchCatalogue = {};
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });

  it('ignores a branch the French catalogue flattened into a string', () => {
    const englishCatalogue = { branch: { leaf: 'Setup' } };
    const frenchCatalogue = { branch: 'Configuration' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });
});
