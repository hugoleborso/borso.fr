import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { diffCatalogues, isInParity, listIdenticalValueKeys } from './i18n-parity.core';

/**
 * borso.fr is a French site with an English translation, so an English string
 * sitting in `fr.json` is a missed translation, not a design choice. The only
 * exceptions are the words below, which read the same in both languages. Adding
 * a key here is a claim a reviewer can check against the comment next to it.
 */
const KEYS_IDENTICAL_IN_BOTH_LANGUAGES: readonly string[] = [
  'common.brand.domain', // the .fr TLD
  'common.brand.name', // the brand, lowercase in both
  'home.menu.art', // same word, same spelling
  'mondrian.animation.cascade', // same word, same spelling
  'mondrian.artwork-title.adjective.patient.masculine', // same word, same spelling
  'mondrian.colour.citrine', // the gemstone, same spelling
  'mondrian.colour.cobalt', // the metal, same spelling
  'mondrian.colour.indigo', // the dye, same spelling
  'mondrian.colour.onyx', // the gemstone, same spelling
  'mondrian.credit.tail-cascade', // names the "Cascade" mode above
  'mondrian.field.colour-balance-value', // "{{percentage}}%" — a percent sign
  'mondrian.field.line-weight-value', // "{{weight}} px" — an SI-style unit symbol
  'mondrian.palette.legend', // same word, same spelling
  'mondrian.palette.nocturne', // same word, same spelling
  'mondrian.section.animation', // same word, same spelling
  'mondrian.section.composition', // same word, same spelling
  'mondrian.section.palette', // same word, same spelling
  'mondrian.stage.work-number', // "Composition · {{number}}" — same word
  'mondrian.subtitle-de-stijl', // the De Stijl movement
  'mondrian.title', // Piet Mondrian, the painter
  'twelve-labours.edition.2026.march.beat-the-metro.note', // two Paris metro stations
  'twelve-labours.proof-label.distance', // same word, same spelling
  'twelve-labours.proof-label.strava', // the Strava product name
];

describe('diffCatalogues', () => {
  it('finds no difference between the shipped catalogues', () => {
    const diff = diffCatalogues(english, french);
    expect(diff).toEqual({ missingInEnglish: [], missingInFrench: [] });
    expect(isInParity(diff)).toBe(true);
  });

  it('reports a key the English catalogue is missing', () => {
    const diff = diffCatalogues({ shared: 'a' }, { shared: 'a', extra: 'b' });
    expect(diff).toEqual({ missingInEnglish: ['extra'], missingInFrench: [] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports a key the French catalogue is missing', () => {
    const diff = diffCatalogues({ shared: 'a', extra: 'b' }, { shared: 'a' });
    expect(diff).toEqual({ missingInEnglish: [], missingInFrench: ['extra'] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports both directions in sorted order', () => {
    const diff = diffCatalogues({ shared: 'a', zebra: 'z', apple: 'a' }, { shared: 'a', yak: 'y' });
    expect(diff).toEqual({ missingInEnglish: ['yak'], missingInFrench: ['apple', 'zebra'] });
    expect(isInParity(diff)).toBe(false);
  });
});

describe('listIdenticalValueKeys', () => {
  it('leaves the shipped catalogues with only the deliberately identical words', () => {
    expect(listIdenticalValueKeys(english, french)).toEqual(KEYS_IDENTICAL_IN_BOTH_LANGUAGES);
  });

  it('reports a nested key whose French value was copied from the English one', () => {
    const englishCatalogue = { page: { kept: 'Palette', translated: 'Ink' } };
    const frenchCatalogue = { page: { kept: 'Palette', translated: 'Ink' } };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([
      'page.kept',
      'page.translated',
    ]);
  });

  it('ignores a key the French catalogue translates, and one it does not carry at all', () => {
    const englishCatalogue = { translated: 'Ink', orphan: 'Paper' };
    const frenchCatalogue = { translated: 'Encre' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });

  it('ignores a branch the French catalogue does not carry at all', () => {
    const englishCatalogue = { branch: { leaf: 'Ink' } };
    expect(listIdenticalValueKeys(englishCatalogue, {})).toEqual([]);
  });

  it('ignores a branch the French catalogue flattened into a string', () => {
    const englishCatalogue = { branch: { leaf: 'Ink' } };
    const frenchCatalogue = { branch: 'Encre' };
    expect(listIdenticalValueKeys(englishCatalogue, frenchCatalogue)).toEqual([]);
  });
});
