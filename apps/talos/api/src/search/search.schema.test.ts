import { describe, expect, it } from 'vitest';
import { searchQuerySchema } from './search.schema';

describe('searchQuerySchema', () => {
  it('accepts an empty query, which answers nothing', () => {
    expect(searchQuerySchema.parse({ q: '' })).toEqual({ q: '' });
  });

  it('refuses a query longer than two hundred characters', () => {
    expect(searchQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: 'x'.repeat(200) }).success).toBe(true);
  });
});
