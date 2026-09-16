import { type PointerEvent as ReactPointerEvent, type MouseEvent, useRef } from 'react';

const LONG_PRESS_MS = 500;

export interface LongPressHandlers {
  readonly onPointerDown: () => void;
  readonly onPointerUp: () => void;
  readonly onPointerLeave: () => void;
  readonly onPointerCancel: () => void;
  readonly onPointerMove: (event: ReactPointerEvent) => void;
  readonly onClickCapture: (event: MouseEvent) => void;
  readonly onContextMenu: (event: MouseEvent) => void;
}

const DRAG_TOLERANCE_PX = 10;

/**
 * @Blueprint hook-timer-owned-by-handlers
 * @BlueprintName Hook Whose Timer Is Started And Cleared By Its Own Handlers
 * @BlueprintUsage Use for a gesture that begins on one DOM event and ends on another, where no effect is needed because nothing outside React starts it.
 * @BlueprintDescription Holds the pending timer and the fired marker in refs, starts the timer in the pointer-down handler and clears it in every handler that ends the press, so the gesture has no lifecycle of its own to synchronise and no `useEffect`. The capture-phase click handler swallows the click a long press would otherwise deliver to the link underneath, which is what lets the gesture sit on a navigating element.
 */
export function useLongPress(onLongPress: () => void): LongPressHandlers {
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFired = useRef(false);

  const clearPending = (): void => {
    if (pendingTimer.current === null) return;
    clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
  };

  return {
    onPointerDown: () => {
      clearPending();
      hasFired.current = false;
      pendingTimer.current = setTimeout(() => {
        pendingTimer.current = null;
        hasFired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerUp: clearPending,
    onPointerLeave: clearPending,
    onPointerCancel: clearPending,
    onPointerMove: (event) => {
      if (pendingTimer.current === null) return;
      const isDragging =
        Math.abs(event.movementX) > DRAG_TOLERANCE_PX ||
        Math.abs(event.movementY) > DRAG_TOLERANCE_PX;
      if (isDragging) clearPending();
    },
    onClickCapture: (event) => {
      if (!hasFired.current) return;
      hasFired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onContextMenu: (event) => {
      event.preventDefault();
    },
  };
}
