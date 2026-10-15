import { describe, expect, it } from 'vitest';
import { calendarFeedBodySchema } from './calendar-feeds.schema';

describe('calendarFeedBodySchema', () => {
  it('accepts an address and trims it', () => {
    expect(
      calendarFeedBodySchema.parse({ address: '  https://a.example/feed.ics ' }),
    ).toStrictEqual({ address: 'https://a.example/feed.ics' });
  });

  it('refuses an empty address, an oversized one, and any other field', () => {
    expect(calendarFeedBodySchema.safeParse({ address: '   ' }).success).toBe(false);
    expect(calendarFeedBodySchema.safeParse({ address: 'x'.repeat(2_049) }).success).toBe(false);
    expect(
      calendarFeedBodySchema.safeParse({ address: 'https://a.example', memberId: 'x' }).success,
    ).toBe(false);
  });
});
