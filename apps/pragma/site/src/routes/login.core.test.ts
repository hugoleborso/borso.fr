import { describe, expect, it } from 'vitest';
import { DEFAULT_POST_LOGIN_PATH, selectPostLoginPath } from './login.core';

describe('selectPostLoginPath', () => {
  it('returns the page the guard bounced the visitor from', () => {
    expect(selectPostLoginPath({ from: '/bars' })).toBe('/bars');
  });

  it('falls back to the catalog when the state carries no origin', () => {
    expect(selectPostLoginPath({})).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('falls back to the catalog for an unusable state', () => {
    expect(selectPostLoginPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(selectPostLoginPath({ from: 42 })).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});
