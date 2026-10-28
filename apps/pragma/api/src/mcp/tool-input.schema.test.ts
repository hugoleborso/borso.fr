import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { namedLineupSchema, pageInputShape, referenceSchema } from './tool-input.schema';

// @FollowsBlueprint test-pure-unit
describe('referenceSchema', () => {
  it('trims a reference and refuses a blank one', () => {
    expect(referenceSchema.parse('  Slow Burn ')).toBe('Slow Burn');
    expect(referenceSchema.safeParse('   ').success).toBe(false);
  });
});

describe('pageInputShape', () => {
  const pageSchema = z.object(pageInputShape);

  it('takes a limit from one to two hundred and a cursor, both optional', () => {
    expect(pageSchema.parse({})).toEqual({});
    expect(pageSchema.parse({ limit: 200, cursor: '40' })).toEqual({ limit: 200, cursor: '40' });
    expect(pageSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(pageSchema.safeParse({ limit: 201 }).success).toBe(false);
  });
});

describe('namedLineupSchema', () => {
  it('maps members to one instrument, several, or null', () => {
    expect(
      namedLineupSchema.parse({ Hugo: 'Batterie', Léa: ['Guitare', 'Chant'], Marc: null }),
    ).toEqual({ Hugo: 'Batterie', Léa: ['Guitare', 'Chant'], Marc: null });
    expect(namedLineupSchema.safeParse({ Hugo: '' }).success).toBe(false);
  });
});
