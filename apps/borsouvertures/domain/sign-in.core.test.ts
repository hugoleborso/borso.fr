import { describe, expect, it } from 'vitest';
import { isSignInPassword, parseSignInRefusal, SIGN_IN_PASSWORD_MAX_LENGTH } from './sign-in.core';

// @FollowsBlueprint test-pure-unit
describe('isSignInPassword', () => {
  it('refuses an empty password', () => {
    expect(isSignInPassword('')).toBe(false);
  });

  it('accepts a single character, since the length rule belongs to the script that writes the credential', () => {
    expect(isSignInPassword('a')).toBe(true);
  });

  it('accepts a password at the limit and refuses one character more', () => {
    expect(isSignInPassword('a'.repeat(SIGN_IN_PASSWORD_MAX_LENGTH))).toBe(true);
    expect(isSignInPassword('a'.repeat(SIGN_IN_PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });
});

describe('parseSignInRefusal', () => {
  it.each(['invalid-credentials', 'rate-limited', 'auth-not-bootstrapped'] as const)(
    'keeps the refusal %s the API names',
    (refusal) => {
      expect(parseSignInRefusal(refusal)).toBe(refusal);
    },
  );

  it.each(['unexpected-failure', undefined, null, 401])(
    'answers null for %j, which is not a refusal of a sign-in',
    (value) => {
      expect(parseSignInRefusal(value)).toBeNull();
    },
  );
});
