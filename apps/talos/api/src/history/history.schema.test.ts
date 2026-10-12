import { describe, expect, it } from 'vitest';
import { briefDateSchema, reviewWeekSchema } from './history.schema';

describe('briefDateSchema', () => {
  it('accepts a day and refuses anything else', () => {
    expect(briefDateSchema.safeParse({ date: '2026-10-08' }).success).toBe(true);
    for (const date of ['2026-10-8', '../2026-10-08', '2026-10-08x', 'x2026-10-08']) {
      expect(briefDateSchema.safeParse({ date }).success).toBe(false);
    }
  });
});

describe('reviewWeekSchema', () => {
  it('accepts an ISO week and refuses anything else', () => {
    expect(reviewWeekSchema.safeParse({ week: '2026-S41' }).success).toBe(true);
    for (const week of ['2026-W41', '2026-S4', '2026-S41-hebdo', 'x2026-S41']) {
      expect(reviewWeekSchema.safeParse({ week }).success).toBe(false);
    }
  });
});
