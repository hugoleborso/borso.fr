import type { Focus, FocusItem } from '@domain/focus.core';

export interface StoredFocusItem {
  readonly title: string;
  readonly why: string | null;
  readonly horizon: string | null;
}

export interface StoredFocus {
  readonly updatedOn: string | null;
  readonly items: readonly StoredFocusItem[];
}

// @FollowsBlueprint core-projection
export function projectStoredFocus(stored: StoredFocus): Focus {
  return {
    updatedOn: stored.updatedOn,
    items: stored.items.map((item): FocusItem => ({
      title: item.title,
      ...(item.why === null ? {} : { why: item.why }),
      ...(item.horizon === null ? {} : { horizon: item.horizon }),
    })),
  };
}
