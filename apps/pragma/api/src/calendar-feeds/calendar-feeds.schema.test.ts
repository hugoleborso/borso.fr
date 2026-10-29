import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { calendarFeedBodySchema, calendarFeedTable } from './calendar-feeds.schema';

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

describe('calendarFeedTable', () => {
  it('indexes the member for the Account list, and one address once per member', () => {
    const indexes = getTableConfig(calendarFeedTable).indexes.map((index) => ({
      name: index.config.name,
      isUnique: index.config.unique,
    }));

    expect(indexes).toEqual([
      { name: 'calendar_feed_member_id_idx', isUnique: false },
      { name: 'calendar_feed_member_id_address_unique', isUnique: true },
    ]);
  });
});
