import { messageTextSchema } from '@domain/routine-run.core';
import { zValidator } from '@hono/zod-validator';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { ROUTINE_TRIGGERS } from '../helpers/routine/routine-fire.core';
import { rejectInvalidInput } from '../helpers/validation/invalid-input.hook';

// @FollowsBlueprint schema-table-and-input
export const routineRunTable = pgTable('routine_run', {
  id: uuid('id').primaryKey(),
  firedAt: timestamp('fired_at', { withTimezone: true, mode: 'date' }).notNull(),
  trigger: text('trigger', { enum: ROUTINE_TRIGGERS }).notNull(),
  subject: text('subject').notNull(),
  sessionUrl: text('session_url'),
});

export const routineMessageSchema = z.object({ text: messageTextSchema });

export const routineMessageValidator = zValidator('json', routineMessageSchema, rejectInvalidInput);
