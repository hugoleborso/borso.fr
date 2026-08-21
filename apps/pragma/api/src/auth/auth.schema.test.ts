import { describe, expect, it } from 'vitest';
import { credentialsSchema } from './auth.schema';

const MINIMUM_LENGTH = 8;
const MAXIMUM_LENGTH = 256;

describe('credentialsSchema', () => {
  it('accepts a password at each end of the allowed range', () => {
    expect(credentialsSchema.safeParse({ password: 'a'.repeat(MINIMUM_LENGTH) }).success).toBe(
      true,
    );
    expect(credentialsSchema.safeParse({ password: 'a'.repeat(MAXIMUM_LENGTH) }).success).toBe(
      true,
    );
  });

  it('refuses a password one character short of the floor', () => {
    expect(credentialsSchema.safeParse({ password: 'a'.repeat(MINIMUM_LENGTH - 1) }).success).toBe(
      false,
    );
  });

  it('refuses a password one character past the ceiling', () => {
    expect(credentialsSchema.safeParse({ password: 'a'.repeat(MAXIMUM_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it('refuses a missing password rather than hashing undefined', () => {
    expect(credentialsSchema.safeParse({}).success).toBe(false);
  });
});
