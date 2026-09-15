import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const IMPROVEMENT_STATUSES = ['idea', 'planned', 'building', 'shipped', 'declined'] as const;

// @FollowsBlueprint schema-table-and-input
export const improvementTable = pgTable('improvement', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  details: text('details').notNull().default(''),
  status: text('status').notNull(),
  authorMemberId: uuid('author_member_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const improvementVoteTable = pgTable(
  'improvement_vote',
  {
    improvementId: uuid('improvement_id').notNull(),
    memberId: uuid('member_id').notNull(),
    castAt: timestamp('cast_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.improvementId, table.memberId] })],
);

const TITLE_MAX = 200;
const DETAILS_MAX = 8_192;

export const improvementCreateSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  details: z.string().max(DETAILS_MAX).default(''),
  status: z.enum(IMPROVEMENT_STATUSES).default('idea'),
});

export const improvementUpdateSchema = improvementCreateSchema.partial();
export const improvementIdParamSchema = z.object({ id: z.string().uuid() });

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];
