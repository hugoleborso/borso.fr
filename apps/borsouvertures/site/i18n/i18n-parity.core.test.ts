import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { areCataloguesInParity, diffCatalogues } from './i18n-parity.core';

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
