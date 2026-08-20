import { describe, expect, it } from 'vitest';
import { loginInputSchema } from './auth.schema';

const MINIMUM_LENGTH = 4;
const MAXIMUM_LENGTH = 32;

describe('loginInputSchema', () => {
  it('accepts a PIN at each end of the allowed range', () => {
    expect(loginInputSchema.safeParse({ pin: '1'.repeat(MINIMUM_LENGTH) }).success).toBe(true);
    expect(loginInputSchema.safeParse({ pin: '1'.repeat(MAXIMUM_LENGTH) }).success).toBe(true);
  });

  it('refuses a PIN one character outside either end', () => {
    expect(loginInputSchema.safeParse({ pin: '1'.repeat(MINIMUM_LENGTH - 1) }).success).toBe(false);
    expect(loginInputSchema.safeParse({ pin: '1'.repeat(MAXIMUM_LENGTH + 1) }).success).toBe(false);
  });

  it('refuses a missing PIN rather than hashing undefined', () => {
    expect(loginInputSchema.safeParse({}).success).toBe(false);
  });
});
