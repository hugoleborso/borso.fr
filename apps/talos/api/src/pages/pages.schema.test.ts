import { describe, expect, it } from 'vitest';
import { pagePathSchema } from './pages.schema';

describe('pagePathSchema', () => {
  it('accepts a page path', () => {
    expect(pagePathSchema.parse({ path: 'second-brain/moi' })).toEqual({
      path: 'second-brain/moi',
    });
  });

  it('refuses an empty path or one longer than any page', () => {
    expect(pagePathSchema.safeParse({ path: '' }).success).toBe(false);
    expect(pagePathSchema.safeParse({ path: 'x'.repeat(301) }).success).toBe(false);
    expect(pagePathSchema.safeParse({ path: 'x'.repeat(300) }).success).toBe(true);
  });
});
