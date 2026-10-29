import { describe, expect, it } from 'vitest';
import { meUpdateToolInputSchema } from './me.schema';

// @FollowsBlueprint test-pure-unit
describe('me.schema', () => {
  it('takes contact details and a study together', () => {
    expect(
      meUpdateToolInputSchema.parse({
        email: null,
        study: { song: 'Creep', instrument: 'Guitar' },
      }),
    ).toEqual({ email: null, study: { song: 'Creep', instrument: 'Guitar' } });
  });

  it('takes nothing at all, which the service answers as an empty update', () => {
    expect(meUpdateToolInputSchema.parse({})).toEqual({});
  });

  it('refuses a study that names no instrument', () => {
    expect(meUpdateToolInputSchema.safeParse({ study: { song: 'Creep' } }).success).toBe(false);
  });
});
