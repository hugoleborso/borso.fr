import { MAXIMUM_FOCUS_ITEMS } from '@domain/focus.core';
import { z } from 'zod';

const focusItemDraftSchema = z.object({
  title: z.string(),
  why: z.string(),
  horizon: z.string(),
});

export const focusFormSchema = z.object({
  items: z.array(focusItemDraftSchema).max(MAXIMUM_FOCUS_ITEMS),
});

export type FocusFormValues = z.infer<typeof focusFormSchema>;
export type FocusItemDraft = z.infer<typeof focusItemDraftSchema>;

export interface FocusItemShape {
  readonly title: string;
  readonly why?: string;
  readonly horizon?: string;
}

export const EMPTY_FOCUS_ITEM: FocusItemDraft = { title: '', why: '', horizon: '' };

// @FollowsBlueprint core-form-schema
export function toFocusFormValues(items: readonly FocusItemShape[]): FocusFormValues {
  return {
    items: items.slice(0, MAXIMUM_FOCUS_ITEMS).map((item) => ({
      title: item.title,
      why: item.why ?? '',
      horizon: item.horizon ?? '',
    })),
  };
}

function toOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildFocusPayload(values: FocusFormValues): { items: FocusItemShape[] } {
  return {
    items: values.items
      .filter((item) => item.title.trim().length > 0)
      .slice(0, MAXIMUM_FOCUS_ITEMS)
      .map((item) => ({
        title: item.title.trim(),
        why: toOptionalText(item.why),
        horizon: toOptionalText(item.horizon),
      })),
  };
}

export function canAddFocusItem(itemCount: number): boolean {
  return itemCount < MAXIMUM_FOCUS_ITEMS;
}

export function isHorizonPast(horizon: string, today: string): boolean {
  return horizon < today;
}
