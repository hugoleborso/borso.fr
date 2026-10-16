import { describe, expect, it } from 'vitest';
import {
  contextQuerySchema,
  neighboursQuerySchema,
  pathQuerySchema,
  searchQuerySchema,
  sqlBodySchema,
  stateQuerySchema,
} from './agent.schema';

describe('agent query schemas', () => {
  it('defaults the context budget to 80000 bytes and reads it from the query string', () => {
    expect(contextQuerySchema.parse({})).toEqual({ budget: 80_000 });
    expect(contextQuerySchema.parse({ budget: '1200' })).toEqual({ budget: 1200 });
    expect(contextQuerySchema.safeParse({ budget: '0' }).success).toBe(false);
  });

  it('caps a search at 50 results and defaults to 20', () => {
    expect(searchQuerySchema.parse({ q: 'Acme' })).toEqual({ q: 'Acme', limit: 20 });
    expect(searchQuerySchema.safeParse({ q: 'Acme', limit: '51' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: '  ' }).success).toBe(false);
  });

  it('walks the graph one to three hops deep on a calendar date', () => {
    expect(neighboursQuerySchema.parse({ slug: 'a' })).toEqual({ slug: 'a', depth: 1 });
    expect(neighboursQuerySchema.safeParse({ slug: 'a', depth: '4' }).success).toBe(false);
    expect(pathQuerySchema.safeParse({ from: 'a', to: 'b', date: '2026-10' }).success).toBe(false);
  });

  it('requires a query and a key', () => {
    expect(sqlBodySchema.safeParse({ query: '' }).success).toBe(false);
    expect(stateQuerySchema.safeParse({}).success).toBe(false);
  });
});
