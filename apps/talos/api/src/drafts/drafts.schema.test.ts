import { describe, expect, it } from 'vitest';
import { draftSlugSchema, draftStatusChangeSchema } from './drafts.schema';

describe('draftSlugSchema', () => {
  it('accepts a file slug, up to the longest allowed', () => {
    expect(draftSlugSchema.safeParse({ slug: '2026-10-08-relance-alice' }).success).toBe(true);
    expect(draftSlugSchema.safeParse({ slug: 'x'.repeat(120) }).success).toBe(true);
  });

  it.each([['../secret'], ['-tiret'], ['Majuscule'], ['x'.repeat(121)]])('refuses %s', (slug) => {
    expect(draftSlugSchema.safeParse({ slug }).success).toBe(false);
  });
});

describe('draftStatusChangeSchema', () => {
  it('accepts the three statuses the app may write', () => {
    for (const status of ['envoye', 'abandonne', 'pret']) {
      expect(draftStatusChangeSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('refuses any other status or field', () => {
    expect(draftStatusChangeSchema.safeParse({ status: 'brouillon' }).success).toBe(false);
    expect(draftStatusChangeSchema.safeParse({}).success).toBe(false);
  });
});
