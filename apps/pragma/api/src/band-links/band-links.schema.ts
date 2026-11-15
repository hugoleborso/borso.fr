import { isHttpsAddress } from '@domain/band-link.core';
import { BAND_LINK_LABEL_MAX_LENGTH, BAND_LINK_URL_MAX_LENGTH } from '@domain/input-limits.core';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const NOT_HTTPS_MESSAGE = 'not-https';

// @FollowsBlueprint schema-table-and-input
export const bandLinkTable = pgTable('band_link', {
  id: uuid('id').primaryKey(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const bandLinkCreateSchema = z
  .object({
    id: z.guid(),
    label: z.string().trim().min(1).max(BAND_LINK_LABEL_MAX_LENGTH),
    url: z
      .string()
      .trim()
      .max(BAND_LINK_URL_MAX_LENGTH)
      .refine(isHttpsAddress, { message: NOT_HTTPS_MESSAGE }),
  })
  .strict();

export const bandLinkPathSchema = z.object({ id: z.guid() });

export type BandLinkCreateInput = z.infer<typeof bandLinkCreateSchema>;

export type BandLink = typeof bandLinkTable.$inferSelect;
