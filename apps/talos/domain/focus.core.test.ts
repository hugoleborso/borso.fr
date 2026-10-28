import { describe, expect, it } from 'vitest';
import { focusItemSchema, focusItemsSchema } from './focus.core';

describe('focusItemSchema', () => {
  it('trims the texts it accepts', () => {
    expect(focusItemSchema.parse({ title: ' Acme ', why: ' vite ' })).toEqual({
      title: 'Acme',
      why: 'vite',
    });
  });

  it.each([
    ['an empty title', { title: '  ' }],
    ['a title carrying bold markers', { title: 'a **b**' }],
    ['a separator the file format reserves', { title: 'a | b' }],
    ['a line break', { title: 'a', why: 'b\nc' }],
    ['a horizon that is not a date', { title: 'a', horizon: 'demain' }],
    ['a text longer than a line should be', { title: 'a'.repeat(301) }],
  ])('refuses %s', (_label, candidate) => {
    expect(focusItemSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts a text exactly as long as allowed', () => {
    expect(focusItemSchema.safeParse({ title: 'a'.repeat(300) }).success).toBe(true);
  });
});

describe('focusItemsSchema', () => {
  it('accepts three items and refuses a fourth', () => {
    const acme = { title: 'a' };
    expect(focusItemsSchema.safeParse([acme, acme, acme]).success).toBe(true);
    expect(focusItemsSchema.safeParse([acme, acme, acme, acme]).success).toBe(false);
  });
});
