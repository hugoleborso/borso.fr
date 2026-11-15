import { date, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

// @FollowsBlueprint schema-dsql-constraints
export const presenceTable = pgTable(
  'presence',
  {
    memberId: uuid('member_id').notNull(),
    presentOn: date('present_on', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ name: 'presence_pk', columns: [table.memberId, table.presentOn] })],
);
