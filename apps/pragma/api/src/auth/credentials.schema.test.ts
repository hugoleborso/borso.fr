import { describe, expect, it } from 'vitest';
import {
  enrolSchema,
  memberLoginSchema,
  passwordSchema,
  usernameSchema,
} from './credentials.schema';

const MEMBER_ID = '11111111-2222-3333-4444-555555555555';
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

  it('requires the band password on an enrolment body', () => {
    expect(
      enrolSchema.safeParse({ memberId: MEMBER_ID, username: 'ada', password: GOOD_PASSWORD })
        .success,
    ).toBe(false);
    expect(
      enrolSchema.safeParse({
        memberId: MEMBER_ID,
        username: 'ada',
        password: GOOD_PASSWORD,
        sharedPassword: GOOD_PASSWORD,
      }).success,
    ).toBe(true);
  });
});
