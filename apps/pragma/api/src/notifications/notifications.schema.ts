import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { NOTIFICATION_CATEGORIES } from './notifications.core';

const ENDPOINT_MAX_LENGTH = 2000;
const DEVICE_KEY_MAX_LENGTH = 500;
const SECURE_SCHEME_PREFIX = 'https://';

// @FollowsBlueprint schema-dsql-constraints
export const pushSubscriptionTable = pgTable('push_subscription', {
  endpoint: text('endpoint').primaryKey(),
  memberId: uuid('member_id').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

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

export const vapidKeyPairTable = pgTable('vapid_key_pair', {
  id: integer('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
});

const endpointSchema = z
  .string()
  .url()
  .max(ENDPOINT_MAX_LENGTH)
  .refine((endpoint) => endpoint.startsWith(SECURE_SCHEME_PREFIX), {
    message: 'a push endpoint is https',
  });
const deviceKeySchema = z.string().min(1).max(DEVICE_KEY_MAX_LENGTH);

export const pushSubscriptionInputSchema = z.object({
  endpoint: endpointSchema,
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: deviceKeySchema, auth: deviceKeySchema }),
});

export const pushUnsubscriptionSchema = z.object({ endpoint: endpointSchema }).strict();

export const preferencesUpdateSchema = z
  .object({ category: z.enum(NOTIFICATION_CATEGORIES), enabled: z.boolean() })
  .strict();

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
