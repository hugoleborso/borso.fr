import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// @FollowsBlueprint schema-identity-free-of-database-constraints
export const realtimeConnectionTable = pgTable('realtime_connection', {
  connectionId: text('connection_id').primaryKey(),
  memberId: uuid('member_id').notNull(),
  clientId: text('client_id').notNull(),
  connectedAt: timestamp('connected_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});
