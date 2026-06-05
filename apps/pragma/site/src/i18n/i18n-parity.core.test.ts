import { describe, expect, it } from 'vitest';
import en from './en.json';
import fr from './fr.json';
import { diffCatalogs, isInParity } from './i18n-parity.core';

describe('i18n-parity.core', () => {
  it('the shipped catalogs are in parity', () => {
    const diff = diffCatalogs(en, fr);
    expect(diff).toEqual({ missingInEn: [], missingInFr: [] });
    expect(isInParity(diff)).toBe(true);
  });

  it('reports keys missing in en', () => {
    const diff = diffCatalogs({ a: 'a' }, { a: 'a', b: 'b' });
    expect(diff).toEqual({ missingInEn: ['b'], missingInFr: [] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports keys missing in fr', () => {
    const diff = diffCatalogs({ a: 'a', b: 'b' }, { a: 'a' });
    expect(diff).toEqual({ missingInEn: [], missingInFr: ['b'] });
    expect(isInParity(diff)).toBe(false);
  });

  it('reports both directions deterministically', () => {
    const diff = diffCatalogs({ a: 'a', x: 'x' }, { a: 'a', y: 'y' });
    expect(diff).toEqual({ missingInEn: ['y'], missingInFr: ['x'] });
  });
});
