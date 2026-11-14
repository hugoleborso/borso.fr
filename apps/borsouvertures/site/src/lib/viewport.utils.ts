const MAX_BOARD_PX = 560;
const MIN_BOARD_PX = 260;
const HORIZONTAL_PADDING_PX = 48;
const ROOMY_BREAKPOINT_PX = 601;
const DESKTOP_BOARD_FRACTION = 0.5;
const DESKTOP_BREAKPOINT_PX = 1024;

export const EVALUATION_BAR_WIDTH_PX = 24;

// @FollowsBlueprint utils-pure-module
export function selectBoardWidth(viewportWidth: number, isEvaluationBarShown = false): number {
  const availableWidth = readAvailableBoardWidth(viewportWidth);
  const barWidth = isEvaluationBarShown ? EVALUATION_BAR_WIDTH_PX : 0;
  return Math.max(MIN_BOARD_PX, Math.min(MAX_BOARD_PX, availableWidth) - barWidth);
}

function readAvailableBoardWidth(viewportWidth: number): number {
  if (viewportWidth >= DESKTOP_BREAKPOINT_PX) return viewportWidth * DESKTOP_BOARD_FRACTION;
  if (viewportWidth >= ROOMY_BREAKPOINT_PX) return viewportWidth - HORIZONTAL_PADDING_PX;
  return viewportWidth;
}
