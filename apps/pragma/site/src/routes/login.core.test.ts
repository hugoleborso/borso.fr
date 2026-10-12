import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_LOGIN_PATH,
  selectRecoverErrorMessageKey,
  selectLoginErrorMessageKey,
  selectPostLoginPath,
  UNKNOWN_LOGIN_ERROR_KEY,
} from './login.core';

// @FollowsBlueprint test-pure-unit
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

describe('selectLoginErrorMessageKey', () => {
  it('names the three failures the sign-in flow plans for', () => {
    expect(selectLoginErrorMessageKey(429)).toBe('auth.rateLimited');
    expect(selectLoginErrorMessageKey(401)).toBe('auth.invalidPassword');
    expect(selectLoginErrorMessageKey(503)).toBe('auth.notBootstrapped');
  });

  it('falls back to the unknown message for any other status', () => {
    expect(selectLoginErrorMessageKey(500)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
    expect(selectLoginErrorMessageKey(200)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
  });

  it('reads a failure with no status at all as unknown', () => {
    expect(selectLoginErrorMessageKey(null)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
  });
});

describe('selectRecoverErrorMessageKey', () => {
  it('names the three failures the recovery flow plans for', () => {
    expect(selectRecoverErrorMessageKey(429)).toBe('auth.recoveryRateLimited');
    expect(selectRecoverErrorMessageKey(401)).toBe('auth.invalidRecovery');
    expect(selectRecoverErrorMessageKey(503)).toBe('auth.notBootstrapped');
  });

  it('says an hour where the sign-in copy says a few minutes', () => {
    expect(selectRecoverErrorMessageKey(429)).not.toBe(selectLoginErrorMessageKey(429));
  });

  it('reads every other status as unknown', () => {
    expect(selectRecoverErrorMessageKey(500)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
    expect(selectRecoverErrorMessageKey(200)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
    expect(selectRecoverErrorMessageKey(null)).toBe(UNKNOWN_LOGIN_ERROR_KEY);
  });
});
