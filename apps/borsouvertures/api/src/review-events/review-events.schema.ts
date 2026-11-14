import { parseReviewEvent, REVIEW_EVENT_BATCH_LIMIT } from '@domain/review-event.core';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const reviewEventTable = pgTable(
  'review_event',
  {
    id: uuid('id').primaryKey(),
    cardId: text('card_id').notNull(),
    outcome: text('outcome').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }).notNull(),
    calendarDay: text('calendar_day').notNull(),
    deviceId: uuid('device_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('review_event_received').on(table.receivedAt, table.id)],
);

export type ReviewEventRow = typeof reviewEventTable.$inferSelect;

const reviewEventSchema = z.unknown().transform((value, context) => {
  const event = parseReviewEvent(value);
  if (event !== null) return event;
  context.addIssue({ code: 'custom', message: 'not a review event' });
  return z.NEVER;
});

export const pushReviewEventsSchema = z.object({
  events: z.array(reviewEventSchema).max(REVIEW_EVENT_BATCH_LIMIT),
});

export const pullReviewEventsQuerySchema = z.object({
  after: z.string().optional(),
});
