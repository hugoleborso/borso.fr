/** @Feature shell */

export const PINNED_EDGE_TOLERANCE_PX = 2;
export const MINIMUM_VISIBLE_FIELD_PX = 16;

export interface VerticalSpan {
  readonly top: number;
  readonly bottom: number;
}

export interface VisibleArea {
  readonly offsetTop: number;
  readonly height: number;
}

export type ScreenPlacementBreach = 'tab-bar-off-visible-bottom' | 'focused-field-off-screen';

export interface ScreenPlacementMeasurement {
  readonly element: VerticalSpan;
  readonly visible: VerticalSpan;
}

// @FollowsBlueprint core-decision
export function visibleSpanOf(area: VisibleArea): VerticalSpan {
  return { top: area.offsetTop, bottom: area.offsetTop + area.height };
}

function isRendered(span: VerticalSpan): boolean {
  return span.bottom > span.top;
}

export function isTabBarOffVisibleBottom(bar: VerticalSpan, visible: VerticalSpan): boolean {
  return isRendered(bar) && Math.abs(bar.bottom - visible.bottom) > PINNED_EDGE_TOLERANCE_PX;
}

export function isFieldOffScreen(field: VerticalSpan, visible: VerticalSpan): boolean {
  const shownHeight = Math.min(field.bottom, visible.bottom) - Math.max(field.top, visible.top);
  return isRendered(field) && shownHeight < MINIMUM_VISIBLE_FIELD_PX;
}

export interface PlacedElements {
  readonly tabBar: VerticalSpan | null;
  readonly focusedField: VerticalSpan | null;
}

export interface PlacementBreachFound {
  readonly breach: ScreenPlacementBreach;
  readonly element: VerticalSpan;
}

export function listScreenPlacementBreaches(
  placed: PlacedElements,
  visible: VerticalSpan,
): PlacementBreachFound[] {
  const { tabBar, focusedField } = placed;
  const breaches: PlacementBreachFound[] = [];
  if (tabBar !== null && isTabBarOffVisibleBottom(tabBar, visible)) {
    breaches.push({ breach: 'tab-bar-off-visible-bottom', element: tabBar });
  }
  if (focusedField !== null && isFieldOffScreen(focusedField, visible)) {
    breaches.push({ breach: 'focused-field-off-screen', element: focusedField });
  }
  return breaches;
}
