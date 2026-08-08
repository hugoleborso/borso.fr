import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { diffCatalogues, isInParity } from './i18n-parity.core';

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
