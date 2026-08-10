const COMPACT_VIEWPORT_MAX_PX = 900;
const MAX_BOARD_PX = 700;
const MIN_BOARD_PX = 260;
const HORIZONTAL_PADDING_PX = 48;
const DESKTOP_BOARD_FRACTION = 0.6;
const DESKTOP_BREAKPOINT_PX = 1024;
const NO_WIDTH_PX = 0;

/**
 * A compact viewport is the one where the opening picker becomes a stepped
 * flow instead of three columns, and where the drill defaults to tappable move
 * buttons instead of arrows drawn on the board.
 */
export function isCompactViewport(viewportWidth: number): boolean {
  return viewportWidth <= COMPACT_VIEWPORT_MAX_PX;
}

/** The board takes a share of a desktop viewport and the full width of a phone. */
export function selectBoardWidth(viewportWidth: number): number {
  const availableWidth = readAvailableBoardWidth(viewportWidth);
  return Math.max(MIN_BOARD_PX, Math.min(MAX_BOARD_PX, availableWidth));
}

function readAvailableBoardWidth(viewportWidth: number): number {
  if (viewportWidth >= DESKTOP_BREAKPOINT_PX) return viewportWidth * DESKTOP_BOARD_FRACTION;
  return Math.max(NO_WIDTH_PX, viewportWidth - HORIZONTAL_PADDING_PX);
}
