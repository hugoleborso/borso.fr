import { describe, expect, it } from 'vitest';
import {
  anchorStateAt,
  BOTTOM_ACTION_BAR_AT_REST,
  IGNORED_SCROLL_MOVEMENT_PX,
  isAtAScrollEdge,
  nextBottomActionBarState,
  readScrollExtent,
  SCROLL_EDGE_TOLERANCE_PX,
} from './bottom-action-bar.core';

const VISIBLE_HEIGHT = 667;
const SCROLLABLE_HEIGHT = 2000;
const FURTHEST_OFFSET = SCROLLABLE_HEIGHT - VISIBLE_HEIGHT;
const MIDDLE_OFFSET = 600;

function extentAt(offset: number) {
  return { offset, visibleHeight: VISIBLE_HEIGHT, scrollableHeight: SCROLLABLE_HEIGHT };
}

// @FollowsBlueprint test-pure-unit
describe('isAtAScrollEdge', () => {
  it('reads the very top as an edge', () => {
    expect(isAtAScrollEdge(extentAt(0))).toBe(true);
  });

  it('still reads a hair below the top as an edge, so a rubber band does not hide the bar', () => {
    expect(isAtAScrollEdge(extentAt(SCROLL_EDGE_TOLERANCE_PX))).toBe(true);
  });

  it('reads the very bottom as an edge', () => {
    expect(isAtAScrollEdge(extentAt(FURTHEST_OFFSET))).toBe(true);
  });

  it('still reads a hair above the bottom as an edge', () => {
    expect(isAtAScrollEdge(extentAt(FURTHEST_OFFSET - SCROLL_EDGE_TOLERANCE_PX))).toBe(true);
  });

  it('reads the middle of the range as no edge at all', () => {
    expect(isAtAScrollEdge(extentAt(MIDDLE_OFFSET))).toBe(false);
  });

  it('reads a region shorter than its viewport as an edge, since it cannot scroll', () => {
    expect(isAtAScrollEdge({ offset: 0, visibleHeight: 667, scrollableHeight: 400 })).toBe(true);
  });
});

describe('readScrollExtent', () => {
  it('names the three measurements the decision needs', () => {
    expect(readScrollExtent({ scrollTop: 120, clientHeight: 667, scrollHeight: 2000 })).toEqual({
      offset: 120,
      visibleHeight: 667,
      scrollableHeight: 2000,
    });
  });
});

describe('nextBottomActionBarState', () => {
  const hiddenInTheMiddle = { anchorOffset: MIDDLE_OFFSET, isShowing: false };
  const shownInTheMiddle = { anchorOffset: MIDDLE_OFFSET, isShowing: true };

  it('shows the bar at an edge even when it was hidden on the way there', () => {
    expect(nextBottomActionBarState(hiddenInTheMiddle, { offset: 0, isAtAnEdge: true })).toEqual({
      anchorOffset: 0,
      isShowing: true,
    });
  });

  it('hides the bar once the reader has scrolled down past the jitter allowance', () => {
    const next = nextBottomActionBarState(shownInTheMiddle, {
      offset: MIDDLE_OFFSET + IGNORED_SCROLL_MOVEMENT_PX + 1,
      isAtAnEdge: false,
    });
    expect(next.isShowing).toBe(false);
    expect(next.anchorOffset).toBe(MIDDLE_OFFSET + IGNORED_SCROLL_MOVEMENT_PX + 1);
  });

  it('reveals the bar once the reader has scrolled back up past the jitter allowance', () => {
    const next = nextBottomActionBarState(hiddenInTheMiddle, {
      offset: MIDDLE_OFFSET - IGNORED_SCROLL_MOVEMENT_PX - 1,
      isAtAnEdge: false,
    });
    expect(next.isShowing).toBe(true);
    expect(next.anchorOffset).toBe(MIDDLE_OFFSET - IGNORED_SCROLL_MOVEMENT_PX - 1);
  });

  it('keeps the anchor and the decision when the movement is under the allowance', () => {
    const next = nextBottomActionBarState(shownInTheMiddle, {
      offset: MIDDLE_OFFSET + IGNORED_SCROLL_MOVEMENT_PX - 1,
      isAtAnEdge: false,
    });
    expect(next).toBe(shownInTheMiddle);
  });

  it('acts on a downward movement of exactly the allowance, so the boundary belongs to the decision', () => {
    const next = nextBottomActionBarState(shownInTheMiddle, {
      offset: MIDDLE_OFFSET + IGNORED_SCROLL_MOVEMENT_PX,
      isAtAnEdge: false,
    });
    expect(next.isShowing).toBe(false);
  });

  it('acts on an upward movement of exactly the allowance too', () => {
    const next = nextBottomActionBarState(hiddenInTheMiddle, {
      offset: MIDDLE_OFFSET - IGNORED_SCROLL_MOVEMENT_PX,
      isAtAnEdge: false,
    });
    expect(next.isShowing).toBe(true);
  });

  it('shows the bar at an edge even when the movement that reached it was downward and long', () => {
    const next = nextBottomActionBarState(hiddenInTheMiddle, {
      offset: MIDDLE_OFFSET + IGNORED_SCROLL_MOVEMENT_PX * 4,
      isAtAnEdge: true,
    });
    expect(next.isShowing).toBe(true);
  });

  it('accumulates a slow scroll against the anchor rather than the previous event', () => {
    const creep = [2, 4, 6, 8, 10].reduce(
      (state, travelled) =>
        nextBottomActionBarState(state, {
          offset: MIDDLE_OFFSET + travelled,
          isAtAnEdge: false,
        }),
      shownInTheMiddle,
    );
    expect(creep.isShowing).toBe(false);
  });
});

describe('the resting state', () => {
  it('starts shown at the top', () => {
    expect(BOTTOM_ACTION_BAR_AT_REST).toEqual({ anchorOffset: 0, isShowing: true });
  });

  it('anchors a bar that mounts halfway down an already scrolled page, still shown', () => {
    expect(anchorStateAt(MIDDLE_OFFSET)).toEqual({
      anchorOffset: MIDDLE_OFFSET,
      isShowing: true,
    });
  });
});
