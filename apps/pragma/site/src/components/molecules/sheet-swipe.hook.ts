import { type TouchEvent, useRef } from 'react';
import { followSwipeDown, shouldCloseAfterSwipe } from './sheet-swipe.utils';

export interface SheetSwipeHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: () => void;
  readonly onTouchCancel: () => void;
}

interface SwipeInProgress {
  readonly dialog: HTMLDialogElement;
  readonly startY: number;
  distancePx: number;
}

const TRANSITION_OFF = 'none';

function releaseDialog(dialog: HTMLDialogElement): void {
  dialog.style.removeProperty('transition');
  dialog.style.removeProperty('transform');
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useSheetSwipe(isClosable: boolean): SheetSwipeHandlers {
  const swipe = useRef<SwipeInProgress | null>(null);

  const endSwipe = (isClosingAllowed: boolean): void => {
    const ended = swipe.current;
    swipe.current = null;
    if (ended === null) return;
    releaseDialog(ended.dialog);
    const isClosing = isClosingAllowed && shouldCloseAfterSwipe(ended.distancePx);
    if (isClosing) ended.dialog.close();
  };

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      const dialog = event.currentTarget.closest('dialog');
      if (!isClosable || touch === undefined || dialog === null) return;
      dialog.style.setProperty('transition', TRANSITION_OFF);
      swipe.current = { dialog, startY: touch.clientY, distancePx: 0 };
    },
    onTouchMove: (event) => {
      const touch = event.touches[0];
      const current = swipe.current;
      if (current === null || touch === undefined) return;
      current.distancePx = followSwipeDown(current.startY, touch.clientY);
      current.dialog.style.setProperty('transform', `translateY(${current.distancePx}px)`);
    },
    onTouchEnd: () => endSwipe(true),
    onTouchCancel: () => endSwipe(false),
  };
}
