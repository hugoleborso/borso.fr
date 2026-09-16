import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// @FollowsBlueprint schema-table-and-input
export const outreachTemplateTable = pgTable('outreach_template', {
  id: integer('id').primaryKey(),
  body: text('body').notNull(),
});

export const OUTREACH_TEMPLATE_ROW_ID = 1;

const TEMPLATE_BODY_MAX = 4_096;

export const outreachTemplateSaveSchema = z.object({
  body: z.string().trim().min(1).max(TEMPLATE_BODY_MAX),
});
