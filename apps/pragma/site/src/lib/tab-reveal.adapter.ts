import { selectScrollLeftRevealing } from '../components/molecules/tab-row-overflow.utils';

export const TAB_OVERFLOW_CUE_WIDTH_PX = 40;

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint ref-callback-browser-api
export function revealTabInItsRow(tab: HTMLElement | null): void {
  if (tab === null) return;
  const row = tab.parentElement;
  if (row === null) return;
  row.scrollLeft = selectScrollLeftRevealing(tab, row, TAB_OVERFLOW_CUE_WIDTH_PX);
}
