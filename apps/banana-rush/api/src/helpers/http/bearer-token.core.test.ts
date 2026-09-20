import { describe, expect, it } from 'vitest';
import { readBearerToken } from './bearer-token.core';

// @FollowsBlueprint test-pure-unit
describe('readBearerToken', () => {
  it('reads the token after the scheme', () => {
    expect(readBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('accepts the scheme in any case, because the specification does not fix it', () => {
    expect(readBearerToken('bearer abc123')).toBe('abc123');
    expect(readBearerToken('BEARER abc123')).toBe('abc123');
  });

  it('ignores the padding a client may leave around the value', () => {
    expect(readBearerToken('  Bearer   abc123  ')).toBe('abc123');
  });

  it('answers nothing for another scheme', () => {
    expect(readBearerToken('Basic abc123')).toBeNull();
  });

  it('answers nothing for a scheme carrying no token', () => {
    expect(readBearerToken('Bearer')).toBeNull();
    expect(readBearerToken('Bearer    ')).toBeNull();
  });

  it('answers nothing when the header is absent', () => {
    expect(readBearerToken(undefined)).toBeNull();
  });

  it('answers nothing for an empty header', () => {
    expect(readBearerToken('')).toBeNull();
  });
});
