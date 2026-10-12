import { zValidator } from '@hono/zod-validator';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

const MAXIMUM_ENDPOINT_LENGTH = 2000;
const MAXIMUM_KEY_LENGTH = 500;

// @FollowsBlueprint schema-table-and-input
export const pushSubscriptionTable = pgTable('push_subscription', {
  endpoint: text('endpoint').primaryKey(),
  publicKey: text('public_key').notNull(),
  authenticationSecret: text('authentication_secret').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const endpointSchema = z.url({ protocol: /^https$/ }).max(MAXIMUM_ENDPOINT_LENGTH);
const keySchema = z.string().min(1).max(MAXIMUM_KEY_LENGTH);

export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: keySchema, auth: keySchema }),
});

export const pushUnsubscriptionSchema = z.object({ endpoint: endpointSchema });

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushSubscriptionValidator = zValidator(
  'json',
  pushSubscriptionSchema,
  rejectInvalidInput,
);

export const pushUnsubscriptionValidator = zValidator(
  'json',
  pushUnsubscriptionSchema,
  rejectInvalidInput,
);
