import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const ADDRESS_MAX = 2_048;

// @FollowsBlueprint schema-table-and-input
export const calendarFeedTable = pgTable(
  'calendar_feed',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id').notNull(),
    address: text('address').notNull(),
    name: text('name'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    index('calendar_feed_member_id_idx').on(table.memberId),
    uniqueIndex('calendar_feed_member_id_address_unique').on(table.memberId, table.address),
  ],
);

export const calendarFeedBodySchema = z
  .object({ address: z.string().trim().min(1).max(ADDRESS_MAX) })
  .strict();

export const calendarFeedIdParamSchema = z.object({ id: z.string().uuid() });
