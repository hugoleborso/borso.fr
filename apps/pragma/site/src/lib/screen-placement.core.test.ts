import { describe, expect, it } from 'vitest';
import {
  listScreenPlacementBreaches,
  isFieldOffScreen,
  isTabBarOffVisibleBottom,
  MINIMUM_VISIBLE_FIELD_PX,
  PINNED_EDGE_TOLERANCE_PX,
  visibleSpanOf,
} from './screen-placement.core';

const SCREEN = { top: 0, bottom: 800 };
const ABOVE_KEYBOARD = { top: 0, bottom: 500 };
const TAB_BAR_HEIGHT = 56;

describe('visibleSpanOf', () => {
  it('places the visible screen at its offset in the layout viewport', () => {
    expect(visibleSpanOf({ offsetTop: 120, height: 500 })).toEqual({ top: 120, bottom: 620 });
  });
});

describe('isTabBarOffVisibleBottom', () => {
  it('accepts a tab bar resting on the bottom of the visible screen', () => {
    expect(isTabBarOffVisibleBottom({ top: 744, bottom: 800 }, SCREEN)).toBe(false);
  });

  it('accepts a tab bar off by no more than the tolerance', () => {
    const bottom = SCREEN.bottom - PINNED_EDGE_TOLERANCE_PX;

    expect(isTabBarOffVisibleBottom({ top: bottom - TAB_BAR_HEIGHT, bottom }, SCREEN)).toBe(false);
  });

  it('flags a tab bar lifted above the bottom of the visible screen', () => {
    const bottom = SCREEN.bottom - PINNED_EDGE_TOLERANCE_PX - 1;

    expect(isTabBarOffVisibleBottom({ top: bottom - TAB_BAR_HEIGHT, bottom }, SCREEN)).toBe(true);
  });

  it('flags a tab bar left under the keyboard', () => {
    expect(isTabBarOffVisibleBottom({ top: 744, bottom: 800 }, ABOVE_KEYBOARD)).toBe(true);
  });

  it('ignores a tab bar that is hidden', () => {
    expect(isTabBarOffVisibleBottom({ top: 0, bottom: 0 }, ABOVE_KEYBOARD)).toBe(false);
  });
});

describe('isFieldOffScreen', () => {
  it('accepts a field fully above the keyboard', () => {
    expect(isFieldOffScreen({ top: 300, bottom: 340 }, ABOVE_KEYBOARD)).toBe(false);
  });

  it('accepts a field taller than the visible screen', () => {
    expect(isFieldOffScreen({ top: -200, bottom: 900 }, ABOVE_KEYBOARD)).toBe(false);
  });

  it('accepts a field showing exactly the minimum height', () => {
    const top = ABOVE_KEYBOARD.bottom - MINIMUM_VISIBLE_FIELD_PX;

    expect(isFieldOffScreen({ top, bottom: top + 40 }, ABOVE_KEYBOARD)).toBe(false);
  });

  it('flags a field showing less than the minimum height', () => {
    const top = ABOVE_KEYBOARD.bottom - MINIMUM_VISIBLE_FIELD_PX + 1;

    expect(isFieldOffScreen({ top, bottom: top + 40 }, ABOVE_KEYBOARD)).toBe(true);
  });

  it('flags a field under the keyboard', () => {
    expect(isFieldOffScreen({ top: 620, bottom: 660 }, ABOVE_KEYBOARD)).toBe(true);
  });

  it('flags a field scrolled above the visible screen', () => {
    expect(isFieldOffScreen({ top: 40, bottom: 80 }, { top: 300, bottom: 800 })).toBe(true);
  });

  it('ignores a field that is not rendered', () => {
    expect(isFieldOffScreen({ top: 0, bottom: 0 }, { top: 300, bottom: 800 })).toBe(false);
  });
});

describe('listScreenPlacementBreaches', () => {
  const lowBar = { top: 744, bottom: 800 };
  const hiddenField = { top: 620, bottom: 660 };

  it('finds nothing when neither element is on the page', () => {
    expect(
      listScreenPlacementBreaches({ tabBar: null, focusedField: null }, ABOVE_KEYBOARD),
    ).toEqual([]);
  });

  it('finds nothing when both elements are placed on the visible screen', () => {
    const placed = { tabBar: { top: 444, bottom: 500 }, focusedField: { top: 300, bottom: 340 } };

    expect(listScreenPlacementBreaches(placed, ABOVE_KEYBOARD)).toEqual([]);
  });

  it('finds both breaches, the tab bar first', () => {
    const placed = { tabBar: lowBar, focusedField: hiddenField };

    expect(listScreenPlacementBreaches(placed, ABOVE_KEYBOARD)).toEqual([
      { breach: 'tab-bar-off-visible-bottom', element: lowBar },
      { breach: 'focused-field-off-screen', element: hiddenField },
    ]);
  });
});
