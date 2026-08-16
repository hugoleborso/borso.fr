/**
 * A runner slug is the identifier the URL carries, so its character rule is the
 * one worth pinning; the bib is mandatory here even though the column is not.
 */

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { createRunnerInputSchema, runnersTable, runnerSlugSchema } from './runner.schema';

const MAXIMUM_BIB = 9_999;

function runner(overrides: Record<string, unknown> = {}): unknown {
  return {
    editionSlug: 'lepin-2026',
    slug: 'alice',
    displayName: 'Alice',
    bib: 12,
    ...overrides,
  };
}

describe('runnerSlugSchema', () => {
  it('accepts lowercase letters, digits and dashes', () => {
    expect(runnerSlugSchema.safeParse('alice-2').success).toBe(true);
  });

  it('refuses anything else, and says what it wanted', () => {
    expect(() => runnerSlugSchema.parse('Alice')).toThrow('lowercase');
    expect(runnerSlugSchema.safeParse('alice_2').success).toBe(false);
  });

  it('refuses a slug outside the length bounds', () => {
    expect(runnerSlugSchema.safeParse('a').success).toBe(false);
    expect(runnerSlugSchema.safeParse('a'.repeat(65)).success).toBe(false);
  });
});

describe('createRunnerInputSchema', () => {
  it('accepts a runner with a bib and no photo', () => {
    expect(createRunnerInputSchema.safeParse(runner()).success).toBe(true);
  });

  it('needs a bib, because the boundary always knows the dossard', () => {
    expect(
      createRunnerInputSchema.safeParse({
        editionSlug: 'lepin-2026',
        slug: 'alice',
        displayName: 'Alice',
      }).success,
    ).toBe(false);
  });

  it('refuses a bib that is not a positive whole dossard', () => {
    for (const bib of [0, -1, 12.5, MAXIMUM_BIB + 1]) {
      expect(createRunnerInputSchema.safeParse(runner({ bib })).success).toBe(false);
    }
  });

  it('accepts a photo key, or null for a runner with no photo yet', () => {
    expect(createRunnerInputSchema.safeParse(runner({ photoKey: 'photos/a.jpg' })).success).toBe(
      true,
    );
    expect(createRunnerInputSchema.safeParse(runner({ photoKey: null })).success).toBe(true);
    expect(createRunnerInputSchema.safeParse(runner({ photoKey: '' })).success).toBe(false);
  });

  it('refuses a display name that is empty or past the ceiling', () => {
    expect(createRunnerInputSchema.safeParse(runner({ displayName: '' })).success).toBe(false);
    expect(
      createRunnerInputSchema.safeParse(runner({ displayName: 'a'.repeat(121) })).success,
    ).toBe(false);
  });
});

describe('the runners table', () => {
  it('is keyed by edition and slug, so a slug is unique inside one race', () => {
    const [primary] = getTableConfig(runnersTable).primaryKeys;
    expect(primary?.columns.map((column) => column.name)).toEqual(['edition_slug', 'slug']);
  });
});
