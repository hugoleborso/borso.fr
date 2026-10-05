import { describe, expect, it } from 'vitest';
import { focusUpdateSchema } from './focus.schema';

describe('focusUpdateSchema', () => {
  it('accepts up to three items', () => {
    expect(focusUpdateSchema.safeParse({ items: [{ title: 'Acme' }] }).success).toBe(true);
  });

  it('refuses a fourth item', () => {
    const acme = { title: 'Acme' };
    expect(focusUpdateSchema.safeParse({ items: [acme, acme, acme, acme] }).success).toBe(false);
  });
});
