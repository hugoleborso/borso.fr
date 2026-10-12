import { describe, expect, it } from 'vitest';
import { graphQuerySchema } from './graph.schema';

describe('graphQuerySchema', () => {
  it('accepts no date or a calendar date', () => {
    expect(graphQuerySchema.parse({})).toEqual({});
    expect(graphQuerySchema.parse({ date: '2026-03-15' })).toEqual({ date: '2026-03-15' });
  });

  it('refuses a partial date', () => {
    expect(graphQuerySchema.safeParse({ date: '2026-03' }).success).toBe(false);
  });
});
