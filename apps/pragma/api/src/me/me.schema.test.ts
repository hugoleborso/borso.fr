import { describe, expect, it } from 'vitest';
import { meUpdateToolInputSchema } from './me.schema';

// @FollowsBlueprint test-pure-unit
describe('me.schema', () => {
  it('takes contact details', () => {
    expect(meUpdateToolInputSchema.parse({ email: null })).toEqual({ email: null });
  });

  it('takes nothing at all, which the service answers as an empty update', () => {
    expect(meUpdateToolInputSchema.parse({})).toEqual({});
  });

  it('refuses a study, which no longer lights a flame', () => {
    expect(
      meUpdateToolInputSchema.safeParse({ study: { song: 'Creep', instrument: 'Guitar' } }).success,
    ).toBe(false);
  });
});
