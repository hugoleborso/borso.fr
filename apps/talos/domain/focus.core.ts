import { z } from 'zod';
import { splitFrontMatter } from './front-matter.core';
import { parseLineAttributes } from './line-attributes.core';
import { readCapture, splitHeadFromRest } from './text.core';

export const MAXIMUM_FOCUS_ITEMS = 3;
const MAXIMUM_FOCUS_TEXT_LENGTH = 300;
const FOCUS_ITEM_PATTERN = /^- \*\*(?<title>.+?)\*\*(?<rest>.*)$/;
const WHY_SEPARATOR_PATTERN = /^\s+[—–-]\s+/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SINGLE_LINE_WITHOUT_SEPARATOR = /^[^|\n\r]*$/;
const UPDATED_ON_KEY = 'maj';
const WHY_KEY = 'pourquoi';
const HORIZON_KEY = 'horizon';
const FOCUS_TITLE = '# Focus du moment';

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

function readFocusItem(line: string): FocusItem | null {
  const match = FOCUS_ITEM_PATTERN.exec(line.trim());
  if (match === null) return null;
  const { head: lead, rest: segments } = splitHeadFromRest(readCapture(match, 'rest'), '|');
  const attributes = parseLineAttributes(segments);
  const inlineWhy = WHY_SEPARATOR_PATTERN.test(lead)
    ? lead.replace(WHY_SEPARATOR_PATTERN, '').trim()
    : '';
  const why = inlineWhy === '' ? attributes.get(WHY_KEY) : inlineWhy;
  const horizon = attributes.get(HORIZON_KEY);
  return {
    title: readCapture(match, 'title').trim(),
    ...(why === undefined ? {} : { why }),
    ...(horizon === undefined ? {} : { horizon }),
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseFocus(markdown: string): Focus {
  const { frontMatter, body } = splitFrontMatter(markdown);
  const focusItems = body
    .split('\n')
    .map(readFocusItem)
    .filter((item) => item !== null);
  return { updatedOn: frontMatter[UPDATED_ON_KEY] ?? null, items: focusItems };
}

function formatFocusItem(item: FocusItem): string {
  const why = item.why === undefined ? '' : ` — ${item.why}`;
  const horizon = item.horizon === undefined ? '' : ` | ${HORIZON_KEY}: ${item.horizon}`;
  return `- **${item.title}**${why}${horizon}`;
}

// @FollowsBlueprint core-serializer
export function serializeFocus(updatedOn: string, items: readonly FocusItem[]): string {
  return [
    '---',
    `${UPDATED_ON_KEY}: ${updatedOn}`,
    '---',
    FOCUS_TITLE,
    '',
    ...items.map(formatFocusItem),
    '',
  ].join('\n');
}
