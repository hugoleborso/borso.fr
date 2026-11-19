/** @Feature setlists */

import { type TouchEvent, useRef } from 'react';
import type { SceneKeyCommand } from './setlist-scene.core';
import { selectSwipeCommand } from './scene-swipe.core';

export interface SceneSwipeHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchCancel: () => void;
}

interface SwipeStart {
  readonly x: number;
  readonly y: number;
}

const SIDEWAYS_SCROLL_SELECTOR = '[data-scrolls-sideways]';

function isInSidewaysScroll(target: EventTarget): boolean {
  return target instanceof Element && target.closest(SIDEWAYS_SCROLL_SELECTOR) !== null;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useSceneSwipe(onCommand: (command: SceneKeyCommand) => void): SceneSwipeHandlers {
  const start = useRef<SwipeStart | null>(null);
  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      const isTracked = touch !== undefined && !isInSidewaysScroll(event.target);
      start.current = isTracked ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event) => {
      const began = start.current;
      const touch = event.changedTouches[0];
      start.current = null;
      if (began === null || touch === undefined) return;
      const command = selectSwipeCommand(touch.clientX - began.x, touch.clientY - began.y);
      if (command !== null) onCommand(command);
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
