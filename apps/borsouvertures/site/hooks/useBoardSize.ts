import { useViewportWidth } from '@/hooks/useViewportWidth';

const MAX_BOARD_PX = 700;
const MIN_BOARD_PX = 260;
const HORIZONTAL_PADDING_PX = 48;
const DESKTOP_BOARD_FRACTION = 0.6;
const DESKTOP_BREAKPOINT_PX = 1024;

export function useBoardSize(): number {
  const viewportWidth = useViewportWidth();
  const baseWidth =
    viewportWidth >= DESKTOP_BREAKPOINT_PX
      ? viewportWidth * DESKTOP_BOARD_FRACTION
      : Math.max(0, viewportWidth - HORIZONTAL_PADDING_PX);
  return Math.max(MIN_BOARD_PX, Math.min(MAX_BOARD_PX, baseWidth));
}
