import { describe, expect, it } from 'vitest';
import { adminLoginSchema } from './admin-login.core';

// @FollowsBlueprint test-pure-unit
describe('adminLoginSchema', () => {
  it('accepts a four digit PIN', () => {
    expect(adminLoginSchema.safeParse({ pin: '1234' }).success).toBe(true);
  });

  it('rejects a PIN shorter than four characters', () => {
    expect(adminLoginSchema.safeParse({ pin: '123' }).success).toBe(false);
  });

  it('rejects a PIN longer than thirty two characters', () => {
    expect(adminLoginSchema.safeParse({ pin: '1'.repeat(33) }).success).toBe(false);
  });
});
