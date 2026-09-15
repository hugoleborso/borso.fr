import { describe, expect, it } from 'vitest';
import { buildSignInPayload, credentialsFormSchema } from './sign-in-form.core';

// @FollowsBlueprint test-pure-unit
describe('sign-in-form.core', () => {
  it('refuses a name shorter than two characters and a password shorter than eight', () => {
    expect(
      credentialsFormSchema.safeParse({ username: 'a', password: 'correct-horse' }).success,
    ).toBe(false);
    expect(credentialsFormSchema.safeParse({ username: 'ada', password: 'short' }).success).toBe(
      false,
    );
    expect(
      credentialsFormSchema.safeParse({ username: 'ada', password: 'correct-horse' }).success,
    ).toBe(true);
  });

  it('sends the name the way the API stores it', () => {
    expect(buildSignInPayload({ username: '  Ada  ', password: 'correct-horse' })).toEqual({
      username: 'ada',
      password: 'correct-horse',
    });
  });
});
