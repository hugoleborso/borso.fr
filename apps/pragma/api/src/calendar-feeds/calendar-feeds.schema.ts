import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const ADDRESS_MAX = 2_048;

// @FollowsBlueprint schema-table-and-input
export const memberCalendarFeedTable = pgTable('member_calendar_feed', {
  memberId: uuid('member_id').primaryKey(),
  address: text('address').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const calendarFeedBodySchema = z
  .object({ address: z.string().trim().min(1).max(ADDRESS_MAX) })
  .strict();
