import { describe, expect, it } from 'vitest';
import { seedFixtureSchema } from './test-seed.schema';

describe('seedFixtureSchema', () => {
  it('accepts each fixture the seeder knows', () => {
    for (const fixture of [
      'race-down-to-one-survivor',
      'race-finished',
      'top-with-dnf-candidates',
    ]) {
      expect(seedFixtureSchema.safeParse({ fixture }).success).toBe(true);
    }
  });

  it('refuses a fixture the seeder does not know', () => {
    expect(seedFixtureSchema.safeParse({ fixture: 'race-not-started' }).success).toBe(false);
    expect(seedFixtureSchema.safeParse({}).success).toBe(false);
  });
});
