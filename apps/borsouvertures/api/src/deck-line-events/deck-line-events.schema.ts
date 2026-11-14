import { DECK_LINE_EVENT_BATCH_LIMIT, parseDeckLineEvent } from '@domain/deck-line-event.core';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const deckLineEventTable = pgTable(
  'deck_line_event',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind').notNull(),
    side: text('side').notNull(),
    movesUci: text('moves_uci').notNull(),
    openingName: text('opening_name'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
    calendarDay: text('calendar_day').notNull(),
    deviceId: uuid('device_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('deck_line_event_received').on(table.receivedAt, table.id)],
);

export type DeckLineEventRow = typeof deckLineEventTable.$inferSelect;

const deckLineEventSchema = z.unknown().transform((value, context) => {
  const event = parseDeckLineEvent(value);
  if (event !== null) return event;
  context.addIssue({ code: 'custom', message: 'not a deck line event' });
  return z.NEVER;
});

export const pushDeckLineEventsSchema = z.object({
  events: z.array(deckLineEventSchema).max(DECK_LINE_EVENT_BATCH_LIMIT),
});

export const pullDeckLineEventsQuerySchema = z.object({
  after: z.string().optional(),
});
