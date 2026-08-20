import type { NavigationItemState } from '../../routes/route.core';

export const NAVIGATION_LIST_CLASS = 'flex flex-wrap gap-[2px]';

export const NAVIGATION_ITEM_CLASS =
  'inline-flex items-center min-h-11 px-3.5 py-2 rounded-lg text-[13px] font-medium hover:text-ink hover:bg-bg-elev';

export const NAVIGATION_ITEM_CLASS_BY_STATE: Readonly<Record<NavigationItemState, string>> = {
  active: 'text-ink bg-bg-elev',
  inactive: 'text-ink-2',
};
