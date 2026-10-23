import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// @FollowsBlueprint schema-dsql-constraints
export const pushSubscriptionTable = pgTable(
  'push_subscription',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('push_subscription_endpoint_idx').on(table.endpoint)],
);

export const notificationPreferenceTable = pgTable(
  'notification_preference',
  {
    memberId: uuid('member_id').notNull(),
    category: text('category').notNull(),
    enabled: boolean('enabled').notNull(),
  },
  (table) => [
    primaryKey({ name: 'notification_preference_pk', columns: [table.memberId, table.category] }),
  ],
);

export const notificationDispatchTable = pgTable('notification_dispatch', {
  groupKey: text('group_key').primaryKey(),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true, mode: 'date' }).notNull(),
});
