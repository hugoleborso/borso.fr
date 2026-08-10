import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { areCataloguesInParity, diffCatalogues, listIdenticalValueKeys } from './i18n-parity.core';

/**
 * An English string sitting untouched in `fr.json` is a missed translation, not
 * a design choice. The only exceptions are the entries below, which read the
 * same in both languages. Adding a key here is a claim a reviewer can check
 * against the comment next to it.
 */
const KEYS_IDENTICAL_IN_BOTH_LANGUAGES: readonly string[] = [
  'common.value.none', // an em dash, not a word
  'learn.lines-visited.value', // "{{visited}} / {{total}}" — two numbers and a slash
  'selection.lines.eco', // ECO is the Encyclopaedia of Chess Openings code, untranslated
  'top-bar.brand', // the Borsouvertures brand
  'top-bar.language.english', // the EN language tag
  'top-bar.language.french', // the FR language tag
];

describe('diffCatalogues', () => {
  it('reports the shipped catalogues as being in parity', () => {
    const difference = diffCatalogues(english, french);
    expect(difference).toEqual({ missingInEnglish: [], missingInFrench: [] });
    expect(areCataloguesInParity(difference)).toBe(true);
  });

  it('reports a key present in French only', () => {
    const difference = diffCatalogues({ shared: 'a' }, { shared: 'a', extra: 'b' });
    expect(difference).toEqual({ missingInEnglish: ['extra'], missingInFrench: [] });
    expect(areCataloguesInParity(difference)).toBe(false);
  });

  it('reports a key present in English only', () => {
    const difference = diffCatalogues({ shared: 'a', extra: 'b' }, { shared: 'a' });
    expect(difference).toEqual({ missingInEnglish: [], missingInFrench: ['extra'] });
    expect(areCataloguesInParity(difference)).toBe(false);
  });

  it('reports both directions in sorted order', () => {
    const difference = diffCatalogues(
      { shared: 'a', zebra: 'z', apple: 'a' },
      { shared: 'a', yak: 'y' },
    );
    expect(difference).toEqual({
      missingInEnglish: ['yak'],
      missingInFrench: ['apple', 'zebra'],
    });
  });
});

describe('listIdenticalValueKeys', () => {
  it('leaves the shipped catalogues with only the deliberately identical entries', () => {
    expect(listIdenticalValueKeys(english, french)).toEqual(KEYS_IDENTICAL_IN_BOTH_LANGUAGES);
  });

  it('reports a nested key whose French value was copied from the English one', () => {
    const englishCatalogue = { page: { kept: 'ECO', copied: 'Board' } };
    const frenchCatalogue = { page: { kept: 'ECO', copied: 'Board' } };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([
      'page.copied',
      'page.kept',
    ]);
  });

  it('ignores a key the French catalogue translates, and one it does not carry at all', () => {
    const englishCatalogue = { translated: 'Board', orphan: 'Move' };
    const frenchCatalogue = { translated: 'Échiquier' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });

  it('ignores a branch the French catalogue flattened into a string', () => {
    const englishCatalogue = { branch: { leaf: 'Board' } };
    const frenchCatalogue = { branch: 'Échiquier' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });

  it('ignores a branch the French catalogue does not carry at all', () => {
    const englishCatalogue = { branch: { leaf: 'Board' } };
    expect(listIdenticalValueKeys(englishCatalogue, {})).toEqual([]);
  });
});
