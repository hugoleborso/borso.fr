import { type MouseEvent, type PointerEvent, useRef, useState } from 'react';
import { pulseHaptic } from './haptic.adapter';
import {
  hasMovedBeyondTolerance,
  isSwipeCommitted,
  LONG_PRESS_DELAY_MS,
  type PointerPoint,
  selectSwipeOffset,
} from './press-gesture.core';

export interface PressGestureOptions {
  readonly onLongPress?: () => void;
  readonly onSwipe?: () => void;
}

export interface PressGestureHandlers {
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: () => void;
  readonly onPointerCancel: () => void;
  readonly onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  readonly onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

export interface PressGesture {
  readonly handlers: PressGestureHandlers;
  readonly swipeOffset: number;
}

const PRIMARY_BUTTON = 0;

function readPoint(event: PointerEvent<HTMLElement>): PointerPoint {
  return { x: event.clientX, y: event.clientY };
}

export function usePressGesture({ onLongPress, onSwipe }: PressGestureOptions): PressGesture {
  const startRef = useRef<PointerPoint | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasFiredRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const cancelTimer = (): void => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  };
  const reset = (): void => {
    cancelTimer();
    startRef.current = null;
    setSwipeOffset(0);
  };
  const fire = (gesture: () => void): void => {
    hasFiredRef.current = true;
    pulseHaptic();
    gesture();
  };

  return {
    swipeOffset,
    handlers: {
      onPointerDown: (event) => {
        if (event.button !== PRIMARY_BUTTON) return;
        hasFiredRef.current = false;
        startRef.current = readPoint(event);
        if (onLongPress === undefined) return;
        timerRef.current = setTimeout(() => {
          startRef.current = null;
          setSwipeOffset(0);
          fire(onLongPress);
        }, LONG_PRESS_DELAY_MS);
      },
      onPointerMove: (event) => {
        const start = startRef.current;
        if (start === null) return;
        const current = readPoint(event);
        const hasMoved = hasMovedBeyondTolerance(start, current);
        if (hasMoved) cancelTimer();
        if (onSwipe !== undefined) setSwipeOffset(selectSwipeOffset(start, current));
      },
      onPointerUp: () => {
        const isCommitted = isSwipeCommitted(swipeOffset);
        if (isCommitted && onSwipe !== undefined) fire(onSwipe);
        reset();
      },
      onPointerCancel: reset,
      onClickCapture: (event) => {
        if (!hasFiredRef.current) return;
        hasFiredRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
      onContextMenu: (event) => {
        if (onLongPress !== undefined) event.preventDefault();
      },
    },
  };
}

export const PRESSABLE_CLASS_NAME = 'select-none [-webkit-touch-callout:none]';
