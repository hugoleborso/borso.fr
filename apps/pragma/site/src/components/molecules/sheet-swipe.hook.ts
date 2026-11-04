import { type TouchEvent, useRef } from 'react';
import { followSwipeDown, shouldCloseAfterSwipe } from './sheet-swipe.utils';

export interface SheetSwipeHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: () => void;
  readonly onTouchCancel: () => void;
}

interface SwipeInProgress {
  readonly sheet: HTMLElement;
  readonly startY: number;
  distancePx: number;
}

const TRANSITION_OFF = 'none';
const SHEET_SELECTOR = '[data-sheet]';

function releaseSheet(sheet: HTMLElement): void {
  sheet.style.removeProperty('transition');
  sheet.style.removeProperty('transform');
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useSheetSwipe(isClosable: boolean, onClose: () => void): SheetSwipeHandlers {
  const swipe = useRef<SwipeInProgress | null>(null);

  const endSwipe = (isClosingAllowed: boolean): void => {
    const ended = swipe.current;
    swipe.current = null;
    if (ended === null) return;
    releaseSheet(ended.sheet);
    const isClosing = isClosingAllowed && shouldCloseAfterSwipe(ended.distancePx);
    if (isClosing) onClose();
  };

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      const sheet = event.currentTarget.closest<HTMLElement>(SHEET_SELECTOR);
      if (!isClosable || touch === undefined || sheet === null) return;
      sheet.style.setProperty('transition', TRANSITION_OFF);
      swipe.current = { sheet, startY: touch.clientY, distancePx: 0 };
    },
    onTouchMove: (event) => {
      const touch = event.touches[0];
      const current = swipe.current;
      if (current === null || touch === undefined) return;
      current.distancePx = followSwipeDown(current.startY, touch.clientY);
      current.sheet.style.setProperty('transform', `translateY(${current.distancePx}px)`);
    },
    onTouchEnd: () => endSwipe(true),
    onTouchCancel: () => endSwipe(false),
  };
}
