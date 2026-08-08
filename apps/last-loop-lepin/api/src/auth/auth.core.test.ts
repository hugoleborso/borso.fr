import { describe, expect, it } from 'vitest';
import { httpStatusForAuthDenial, isRequestOriginRejected, parseAllowedOrigins } from './auth.core';

describe('httpStatusForAuthDenial', () => {
  it('answers 429 for a rate-limited denial', () => {
    expect(httpStatusForAuthDenial('rate-limited')).toBe(429);
  });

  it('answers 500 for a misconfigured denial', () => {
    expect(httpStatusForAuthDenial('misconfigured')).toBe(500);
  });

  it('answers 401 for a wrong PIN', () => {
    expect(httpStatusForAuthDenial('invalid-pin')).toBe(401);
  });
});

describe('parseAllowedOrigins', () => {
  it('answers null when the variable is unset', () => {
    expect(parseAllowedOrigins(undefined)).toBeNull();
  });

  it('answers null when the variable is empty, which is not an empty allow-list', () => {
    expect(parseAllowedOrigins('')).toBeNull();
  });

  it('splits on commas and trims each entry', () => {
    expect(parseAllowedOrigins('https://a.example , https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('drops the empty entries a trailing comma leaves behind', () => {
    expect(parseAllowedOrigins('https://a.example,,')).toEqual(['https://a.example']);
  });
});

describe('isRequestOriginRejected', () => {
  const ALLOWED = 'https://a.example';

  it('accepts a GET whatever its origin, since GET changes no state', () => {
    expect(isRequestOriginRejected('GET', 'https://evil.example', ALLOWED)).toBe(false);
  });

  it('accepts a POST when no allow-list is configured', () => {
    expect(isRequestOriginRejected('POST', 'https://evil.example', undefined)).toBe(false);
  });

  it('accepts a POST from an allow-listed origin', () => {
    expect(isRequestOriginRejected('POST', ALLOWED, ALLOWED)).toBe(false);
  });

  it('rejects a POST from an origin outside the allow-list', () => {
    expect(isRequestOriginRejected('POST', 'https://evil.example', ALLOWED)).toBe(true);
  });

  it('rejects a POST carrying no origin header once an allow-list exists', () => {
    expect(isRequestOriginRejected('POST', undefined, ALLOWED)).toBe(true);
  });

  it('rejects the other state-changing methods on the same rule', () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      expect(isRequestOriginRejected(method, 'https://evil.example', ALLOWED)).toBe(true);
    }
  });
});
