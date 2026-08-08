import { describe, expect, it } from 'vitest';
import english from './en.json';
import french from './fr.json';
import { diffCatalogues, isInParity } from './i18n-parity.core';

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
