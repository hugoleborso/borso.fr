import { IMPROVEMENT_TITLE_MAX_LENGTH } from '@domain/input-limits.core';
import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { referenceSchema } from '../mcp/tool-input.schema';
import { DEFAULT_IMPROVEMENT_KIND, IMPROVEMENT_KINDS } from '@domain/improvement.core';

export const IMPROVEMENT_STATUSES = ['idea', 'planned', 'building', 'shipped', 'declined'] as const;

// @FollowsBlueprint schema-table-and-input
export const improvementTable = pgTable('improvement', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  details: text('details').notNull().default(''),
  status: text('status').notNull(),
  kind: text('kind'),
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

const DETAILS_MAX = 8_192;

const improvementFieldShape = {
  title: z.string().trim().min(1).max(IMPROVEMENT_TITLE_MAX_LENGTH),
  details: z.string().max(DETAILS_MAX),
  status: z.enum(IMPROVEMENT_STATUSES),
  kind: z.enum(IMPROVEMENT_KINDS),
};

export const improvementCreateSchema = z.object({
  ...improvementFieldShape,
  details: improvementFieldShape.details.default(''),
  status: improvementFieldShape.status.default('idea'),
  kind: improvementFieldShape.kind.default(DEFAULT_IMPROVEMENT_KIND),
});

export const improvementUpdateSchema = z.object(improvementFieldShape).partial();
export const improvementIdParamSchema = z.object({ id: z.guid() });
export const improvementSaveToolInputSchema = z
  .object({ improvement: referenceSchema.optional() })
  .extend(improvementUpdateSchema.shape);
