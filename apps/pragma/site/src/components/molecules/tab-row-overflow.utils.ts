export const TAB_ROW_OVERFLOWS = ['none', 'start', 'end', 'both'] as const;

export type TabRowOverflow = (typeof TAB_ROW_OVERFLOWS)[number];

export interface HorizontalScrollBox {
  readonly scrollLeft: number;
  readonly clientWidth: number;
  readonly scrollWidth: number;
}

export interface TabBox {
  readonly offsetLeft: number;
  readonly offsetWidth: number;
}

const EDGE_TOLERANCE_PX = 1;

// @FollowsBlueprint utils-pure-module
export function readTabRowOverflow(row: HorizontalScrollBox): TabRowOverflow {
  const isHidingStart = row.scrollLeft > EDGE_TOLERANCE_PX;
  const isHidingEnd = row.scrollLeft + row.clientWidth < row.scrollWidth - EDGE_TOLERANCE_PX;
  if (isHidingStart && isHidingEnd) return 'both';
  if (isHidingStart) return 'start';
  if (isHidingEnd) return 'end';
  return 'none';
}

export function isHidingTabsAtStart(overflow: TabRowOverflow): boolean {
  return overflow === 'start' || overflow === 'both';
}

export function isHidingTabsAtEnd(overflow: TabRowOverflow): boolean {
  return overflow === 'end' || overflow === 'both';
}

export function selectScrollLeftRevealing(
  tab: TabBox,
  row: HorizontalScrollBox,
  cueWidthPx: number,
): number {
  const tabStart = tab.offsetLeft - cueWidthPx;
  const tabEnd = tab.offsetLeft + tab.offsetWidth + cueWidthPx;
  const scrollLeftShowingEnd = Math.max(row.scrollLeft, tabEnd - row.clientWidth);
  return Math.max(0, Math.min(tabStart, scrollLeftShowingEnd));
}
