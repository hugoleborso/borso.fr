export const IGNORED_SCROLL_MOVEMENT_PX = 8;
export const SCROLL_EDGE_TOLERANCE_PX = 2;

export interface ScrollExtent {
  readonly offset: number;
  readonly visibleHeight: number;
  readonly scrollableHeight: number;
}

export interface ScrollReading {
  readonly offset: number;
  readonly isAtAnEdge: boolean;
}

export interface BottomActionBarState {
  readonly anchorOffset: number;
  readonly isShowing: boolean;
}

export const BOTTOM_ACTION_BAR_AT_REST: BottomActionBarState = {
  anchorOffset: 0,
  isShowing: true,
};

export function isAtAScrollEdge(extent: ScrollExtent): boolean {
  const furthestOffset = extent.scrollableHeight - extent.visibleHeight;
  const isAtTheTop = extent.offset <= SCROLL_EDGE_TOLERANCE_PX;
  const isAtTheBottom = extent.offset >= furthestOffset - SCROLL_EDGE_TOLERANCE_PX;
  return isAtTheTop || isAtTheBottom;
}

export function readScrollExtent(region: {
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
}): ScrollExtent {
  return {
    offset: region.scrollTop,
    visibleHeight: region.clientHeight,
    scrollableHeight: region.scrollHeight,
  };
}

// @FollowsBlueprint core-projection
export function nextBottomActionBarState(
  state: BottomActionBarState,
  reading: ScrollReading,
): BottomActionBarState {
  if (reading.isAtAnEdge) return { anchorOffset: reading.offset, isShowing: true };
  const movementSinceAnchor = reading.offset - state.anchorOffset;
  if (movementSinceAnchor <= -IGNORED_SCROLL_MOVEMENT_PX) {
    return { anchorOffset: reading.offset, isShowing: true };
  }
  if (movementSinceAnchor >= IGNORED_SCROLL_MOVEMENT_PX) {
    return { anchorOffset: reading.offset, isShowing: false };
  }
  return state;
}

export function anchorStateAt(offset: number): BottomActionBarState {
  return { anchorOffset: offset, isShowing: true };
}
