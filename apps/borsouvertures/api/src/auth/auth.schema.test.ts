import { SIGN_IN_PASSWORD_MAX_LENGTH } from '@domain/sign-in.core';
import { describe, expect, it } from 'vitest';
import { signInSchema } from './auth.schema';

// @FollowsBlueprint test-pure-unit
describe('signInSchema', () => {
  it('accepts a password within the shared length rule', () => {
    expect(signInSchema.safeParse({ password: 'correct-horse' }).success).toBe(true);
    expect(
      signInSchema.safeParse({ password: 'a'.repeat(SIGN_IN_PASSWORD_MAX_LENGTH) }).success,
    ).toBe(true);
  });

  it('refuses an empty, an overlong or a missing password', () => {
    expect(signInSchema.safeParse({ password: '' }).success).toBe(false);
    expect(
      signInSchema.safeParse({ password: 'a'.repeat(SIGN_IN_PASSWORD_MAX_LENGTH + 1) }).success,
    ).toBe(false);
    expect(signInSchema.safeParse({}).success).toBe(false);
  });
});
