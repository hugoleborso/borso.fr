import { z } from 'zod';

export const MAXIMUM_FOCUS_ITEMS = 3;
const MAXIMUM_FOCUS_TEXT_LENGTH = 300;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SINGLE_LINE_WITHOUT_SEPARATOR = /^[^|\n\r]*$/;

const focusTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_FOCUS_TEXT_LENGTH)
  .regex(SINGLE_LINE_WITHOUT_SEPARATOR);

export const focusItemSchema = z.object({
  title: focusTextSchema.refine((title) => !title.includes('**')),
  why: focusTextSchema.optional(),
  horizon: z.string().regex(ISO_DATE_PATTERN).optional(),
});

export const focusItemsSchema = z.array(focusItemSchema).max(MAXIMUM_FOCUS_ITEMS);

export type FocusItem = z.infer<typeof focusItemSchema>;

export interface Focus {
  readonly updatedOn: string | null;
  readonly items: FocusItem[];
}
