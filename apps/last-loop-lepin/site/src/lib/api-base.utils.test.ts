import { describe, expect, it } from 'vitest';
import {
  composeApiOrigin,
  composeApiTraceTarget,
  composeApiUrl,
  selectApiBase,
} from './api-base.utils';

const PROD_ORIGIN = 'https://last-loop-lepin.borso.fr';
const PREVIEW_ORIGIN = 'https://last-loop-lepin-pr-7.preview.borso.fr';
const PREVIEW_API = 'https://last-loop-lepin-pr-7-api.preview.borso.fr';

// @FollowsBlueprint test-pure-unit
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

describe('composeApiTraceTarget', () => {
  it('matches the API on the page origin when no API base is configured, and nothing else', () => {
    const target = composeApiTraceTarget('', PROD_ORIGIN);

    expect(target.test(`${PROD_ORIGIN}/api/editions?search=x`)).toBe(true);
    expect(target.test(`${PROD_ORIGIN}/assets/index.js`)).toBe(false);
    expect(target.test('https://last-loop-lepin.borso.fr.attacker.example/api/editions')).toBe(
      false,
    );
    expect(target.test('https://last-loop-lepinXborso.fr/api/editions')).toBe(false);
  });

  it('matches the separate API host of a preview, and not the preview page origin', () => {
    const target = composeApiTraceTarget(PREVIEW_API, PREVIEW_ORIGIN);

    expect(target.test(`${PREVIEW_API}/api/editions`)).toBe(true);
    expect(target.test(`${PREVIEW_ORIGIN}/api/editions`)).toBe(false);
    expect(target.test('https://photos-cdn.borso.fr/api/x')).toBe(false);
  });
});
