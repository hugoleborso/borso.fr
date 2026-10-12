import { describe, expect, it } from 'vitest';
import { readBearerToken } from './bearer-token.core';

describe('readBearerToken', () => {
  it('reads the token after the scheme, whatever its case', () => {
    expect(readBearerToken('bearer  s3cret ')).toBe('s3cret');
  });

  it('answers null for an empty header', () => {
    expect(readBearerToken('')).toBeNull();
  });

  it('answers null for another scheme', () => {
    expect(readBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
  });

  it('answers null for a scheme without a token', () => {
    expect(readBearerToken('Bearer ')).toBeNull();
  });

  it('answers null for a token followed by more words', () => {
    expect(readBearerToken('Bearer one two')).toBeNull();
  });
});
