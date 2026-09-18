import { describe, expect, it } from 'vitest';
import {
  recoverPasswordSchema,
  memberLoginSchema,
  passwordSchema,
  usernameSchema,
} from './credentials.schema';

const GOOD_PASSWORD = 'correct-horse-battery';

// @FollowsBlueprint test-pure-unit
describe('credentials.schema', () => {
  it('lowercases and trims a username', () => {
    expect(usernameSchema.parse('  Ada  ')).toBe('ada');
  });

  it('refuses a username carrying a space or an accent', () => {
    expect(usernameSchema.safeParse('ada lovelace').success).toBe(false);
    expect(usernameSchema.safeParse('adaé').success).toBe(false);
  });

  it('refuses a username starting with punctuation', () => {
    expect(usernameSchema.safeParse('-ada').success).toBe(false);
    expect(usernameSchema.safeParse('ada-2').success).toBe(true);
  });

  it('refuses a password shorter than eight characters', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse(GOOD_PASSWORD).success).toBe(true);
  });

  it('accepts a full login body', () => {
    expect(memberLoginSchema.parse({ username: 'Ada', password: GOOD_PASSWORD })).toEqual({
      username: 'ada',
      password: GOOD_PASSWORD,
    });
  });

  it('requires every field a recovery body carries', () => {
    expect(
      recoverPasswordSchema.safeParse({ username: 'ada', sharedPassword: GOOD_PASSWORD }).success,
    ).toBe(false);
    expect(
      recoverPasswordSchema.safeParse({
        username: 'ada',
        sharedPassword: GOOD_PASSWORD,
        newPassword: GOOD_PASSWORD,
      }).success,
    ).toBe(true);
  });
});
