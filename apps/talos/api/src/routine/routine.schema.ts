import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ROUTINE_TRIGGERS } from '../helpers/routine/routine-fire.core';

// @FollowsBlueprint schema-table-and-input
export const routineRunTable = pgTable('routine_run', {
  id: uuid('id').primaryKey(),
  firedAt: timestamp('fired_at', { withTimezone: true, mode: 'date' }).notNull(),
  trigger: text('trigger', { enum: ROUTINE_TRIGGERS }).notNull(),
  subject: text('subject').notNull(),
  sessionUrl: text('session_url'),
});
