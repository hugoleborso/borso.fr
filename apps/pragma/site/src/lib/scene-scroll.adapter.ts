/** @Feature songs */

import { computeScrollStepPx } from '../routes/catalog/scene-view.core';

const TICK_MS = 50;

const CURRENT_PILL_VIEW: ScrollIntoViewOptions = {
  behavior: 'smooth',
  block: 'nearest',
  inline: 'center',
};

interface SceneScroller {
  readonly attach: (element: HTMLElement | null) => void;
  readonly start: (pixelsPerSecond: number) => void;
  readonly stop: () => void;
  readonly scrollToTop: () => void;
}

function createSceneScroller(): SceneScroller {
  let scrollBody: HTMLElement | null = null;
  let tickId: ReturnType<typeof setInterval> | null = null;
  let carriedPx = 0;

  const stop = (): void => {
    if (tickId !== null) clearInterval(tickId);
    tickId = null;
    carriedPx = 0;
  };

  const advanceBy = (pixelsPerSecond: number) => (): void => {
    if (scrollBody === null) return;
    carriedPx += computeScrollStepPx(pixelsPerSecond, TICK_MS);
    const wholePx = Math.floor(carriedPx);
    if (wholePx === 0) return;
    carriedPx -= wholePx;
    scrollBody.scrollTop += wholePx;
  };

  return {
    attach: (element) => {
      scrollBody = element;
      if (element === null) stop();
    },
    start: (pixelsPerSecond) => {
      stop();
      tickId = setInterval(advanceBy(pixelsPerSecond), TICK_MS);
    },
    stop,
    scrollToTop: () => {
      if (scrollBody === null) return;
      scrollBody.scrollTop = 0;
    },
  };
}

const sceneScroller = createSceneScroller();

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint ref-callback-browser-api
export const attachSceneScrollBody = sceneScroller.attach;

export const startSceneAutoScroll = sceneScroller.start;

export const stopSceneAutoScroll = sceneScroller.stop;

export const scrollSceneBodyToTop = sceneScroller.scrollToTop;

export function scrollCurrentPillIntoView(element: HTMLElement | null): void {
  element?.scrollIntoView(CURRENT_PILL_VIEW);
}
