import { describe, expect, it } from 'vitest';
import { composeApiOrigin, composeApiUrl, selectApiBase } from './api-base.utils';

describe('selectApiBase', () => {
  it('returns an empty base when the environment value is absent', () => {
    expect(selectApiBase(undefined)).toBe('');
  });

  it('returns an empty base when the environment value is not a string', () => {
    expect(selectApiBase(42)).toBe('');
  });

  it('returns the value unchanged when it has no trailing slash', () => {
    expect(selectApiBase('https://api-pr-7.borso.fr')).toBe('https://api-pr-7.borso.fr');
  });

  it('drops a single trailing slash', () => {
    expect(selectApiBase('https://api-pr-7.borso.fr/')).toBe('https://api-pr-7.borso.fr');
  });
});

describe('composeApiOrigin', () => {
  it('returns the same origin root when the base is empty', () => {
    expect(composeApiOrigin('')).toBe('/');
  });

  it('returns the base when it names another origin', () => {
    expect(composeApiOrigin('https://api-pr-7.borso.fr')).toBe('https://api-pr-7.borso.fr');
  });
});

describe('composeApiUrl', () => {
  it('leaves the path alone when the base is empty', () => {
    expect(composeApiUrl('', '/api/standings/lepin-2026/csv')).toBe(
      '/api/standings/lepin-2026/csv',
    );
  });

  it('prefixes the path with the base', () => {
    expect(composeApiUrl('https://api-pr-7.borso.fr', '/api/health')).toBe(
      'https://api-pr-7.borso.fr/api/health',
    );
  });
});
