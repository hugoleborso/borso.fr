import { describe, expect, it } from 'vitest';
import {
  proposalDecisionSchema,
  proposalSlugSchema,
  proposalStatusQuerySchema,
} from './proposals.schema';

describe('proposalSlugSchema', () => {
  it('accepts a file slug', () => {
    expect(proposalSlugSchema.safeParse({ slug: '2026-10-04-cv-bruno' }).success).toBe(true);
  });

  it.each([['../secret'], ['-tiret'], ['Majuscule'], ['x'.repeat(121)]])('refuses %s', (slug) => {
    expect(proposalSlugSchema.safeParse({ slug }).success).toBe(false);
  });

  it('accepts a slug exactly as long as allowed', () => {
    expect(proposalSlugSchema.safeParse({ slug: 'x'.repeat(120) }).success).toBe(true);
  });
});

describe('proposalDecisionSchema', () => {
  it('accepts the two decisions of the file format', () => {
    expect(proposalDecisionSchema.parse({ decision: 'acceptee', comment: 'vas-y' })).toEqual({
      decision: 'acceptee',
      comment: 'vas-y',
    });
    expect(proposalDecisionSchema.safeParse({ decision: 'refusee' }).success).toBe(true);
  });

  it('refuses another decision or a comment too long', () => {
    expect(proposalDecisionSchema.safeParse({ decision: 'faite' }).success).toBe(false);
    expect(
      proposalDecisionSchema.safeParse({ decision: 'acceptee', comment: 'x'.repeat(2001) }).success,
    ).toBe(false);
    expect(
      proposalDecisionSchema.safeParse({ decision: 'acceptee', comment: 'x'.repeat(2000) }).success,
    ).toBe(true);
  });
});

describe('proposalStatusQuerySchema', () => {
  it('accepts an optional short status', () => {
    expect(proposalStatusQuerySchema.parse({})).toEqual({});
    expect(proposalStatusQuerySchema.safeParse({ status: 'x'.repeat(31) }).success).toBe(false);
    expect(proposalStatusQuerySchema.safeParse({ status: 'x'.repeat(30) }).success).toBe(true);
  });
});
