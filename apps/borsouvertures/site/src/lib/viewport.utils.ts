const COMPACT_VIEWPORT_MAX_PX = 900;
const MAX_BOARD_PX = 560;
const MIN_BOARD_PX = 260;
const HORIZONTAL_PADDING_PX = 48;
const ROOMY_BREAKPOINT_PX = 601;
const DESKTOP_BOARD_FRACTION = 0.5;
const DESKTOP_BREAKPOINT_PX = 1024;
const NAME_CARD_PHONE_BOARD_PX = 288;

export function isCompactViewport(viewportWidth: number): boolean {
  return viewportWidth <= COMPACT_VIEWPORT_MAX_PX;
}

// @FollowsBlueprint utils-pure-module
export function selectBoardWidth(viewportWidth: number): number {
  const availableWidth = readAvailableBoardWidth(viewportWidth);
  return Math.max(MIN_BOARD_PX, Math.min(MAX_BOARD_PX, availableWidth));
}

function readAvailableBoardWidth(viewportWidth: number): number {
  if (viewportWidth >= DESKTOP_BREAKPOINT_PX) return viewportWidth * DESKTOP_BOARD_FRACTION;
  if (viewportWidth >= ROOMY_BREAKPOINT_PX) return viewportWidth - HORIZONTAL_PADDING_PX;
  return viewportWidth;
}

export function selectNameCardBoardWidth(viewportWidth: number): number {
  const boardWidth = selectBoardWidth(viewportWidth);
  if (viewportWidth >= ROOMY_BREAKPOINT_PX) return boardWidth;
  return Math.min(NAME_CARD_PHONE_BOARD_PX, boardWidth);
}
