/** @Feature shell */

import { debounce } from './debounce.utils';
import { reportScreenPlacementBreach } from '../observability/error-reporting.adapter';
import {
  listScreenPlacementBreaches,
  type ScreenPlacementBreach,
  type ScreenPlacementMeasurement,
  type VerticalSpan,
  type VisibleArea,
  visibleSpanOf,
} from './screen-placement.core';

const TAB_BAR_SELECTOR = '[data-bottom-bar]';
export const SETTLE_DELAY_MS = 400;

export interface PlacementHost {
  readonly visualViewport: (EventTarget & VisibleArea) | null;
  readonly document: Pick<Document, 'activeElement' | 'querySelector' | 'addEventListener'>;
}

export type BreachReporter = (
  breach: ScreenPlacementBreach,
  measurement: ScreenPlacementMeasurement,
) => void;

function spanOf(element: Element): VerticalSpan {
  const box = element.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom };
}

function isTypedField(element: Element | null): element is HTMLElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint injected-browser-api
export function watchScreenPlacement(
  host: PlacementHost = window,
  report: BreachReporter = reportScreenPlacementBreach,
): void {
  const area = host.visualViewport;
  if (area === null) return;
  const reported = new Set<ScreenPlacementBreach>();
  const reportOnce = (breach: ScreenPlacementBreach, element: VerticalSpan): void => {
    if (reported.has(breach)) return;
    reported.add(breach);
    report(breach, { element, visible: visibleSpanOf(area) });
  };
  const checkPlacement = (): void => {
    const tabBar = host.document.querySelector(TAB_BAR_SELECTOR);
    const field = host.document.activeElement;
    const isFieldTyped = isTypedField(field);
    const placed = {
      tabBar: tabBar === null ? null : spanOf(tabBar),
      focusedField: isFieldTyped ? spanOf(field) : null,
    };
    for (const { breach, element } of listScreenPlacementBreaches(placed, visibleSpanOf(area))) {
      reportOnce(breach, element);
    }
  };
  const checkOnceSettled = debounce(checkPlacement, SETTLE_DELAY_MS);
  area.addEventListener('resize', checkOnceSettled);
  area.addEventListener('scroll', checkOnceSettled);
  host.document.addEventListener('focusin', checkOnceSettled);
}
