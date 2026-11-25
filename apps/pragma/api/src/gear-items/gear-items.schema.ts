import { GEAR_ITEM_LABEL_MAX_LENGTH } from '@domain/input-limits.core';
import { DEFAULT_GEAR_STATUS, GEAR_STATUSES } from '@domain/gear-status.core';
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { referenceSchema } from '../mcp/tool-input.schema';

// @FollowsBlueprint schema-table-and-input
export const gearItemTable = pgTable('gear_item', {
  id: uuid('id').primaryKey(),
  sessionId: uuid('session_id').notNull(),
  label: text('label').notNull(),
  status: text('status').notNull(),
  memberId: uuid('member_id'),
  position: integer('position').notNull(),
});

const gearItemFieldShape = {
  label: z.string().trim().min(1).max(GEAR_ITEM_LABEL_MAX_LENGTH),
  status: z.enum(GEAR_STATUSES),
  memberId: z.guid().nullable(),
};

export const gearItemCreateSchema = z
  .object({
    id: z.guid(),
    ...gearItemFieldShape,
    status: gearItemFieldShape.status.default(DEFAULT_GEAR_STATUS),
    memberId: gearItemFieldShape.memberId.default(null),
  })
  .strict();

export const gearItemUpdateSchema = z.object(gearItemFieldShape).strict().partial();

export const gearItemCopySchema = z.object({ fromSessionId: z.guid() }).strict();

export const gearSessionParamSchema = z.object({ sessionId: z.guid() });

export const gearItemParamSchema = z.object({ sessionId: z.guid(), id: z.guid() });

export const gearItemSaveToolInputSchema = z.object({
  session: referenceSchema,
  item: referenceSchema.optional(),
  label: gearItemFieldShape.label.optional(),
  holder: referenceSchema.nullable().optional(),
});

export const gearItemToolCreateSchema = z.object({ label: gearItemFieldShape.label });

export type GearItemCreateInput = z.infer<typeof gearItemCreateSchema>;

export type GearItemUpdateInput = z.infer<typeof gearItemUpdateSchema>;
