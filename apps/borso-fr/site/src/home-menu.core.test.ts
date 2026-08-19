import { describe, expect, it } from 'vitest';
import {
  canAnimateIn,
  isMenuOpenAfterKey,
  selectBurgerLabelKey,
  selectMenuItemTransitionDelay,
} from './home-menu.core';

// @FollowsBlueprint test-pure-unit
describe('selectMenuItemTransitionDelay', () => {
  it('staggers the items as the menu opens', () => {
    expect(selectMenuItemTransitionDelay(true, 0)).toBe('80ms');
    expect(selectMenuItemTransitionDelay(true, 2)).toBe('200ms');
  });

  it('snaps every item back together as the menu closes', () => {
    expect(selectMenuItemTransitionDelay(false, 3)).toBe('0ms');
  });
});

describe('isMenuOpenAfterKey', () => {
  it('closes an open menu on Escape', () => {
    expect(isMenuOpenAfterKey('Escape', true, false)).toBe(false);
  });

  it('leaves the menu alone for any other key', () => {
    expect(isMenuOpenAfterKey('a', true, false)).toBe(true);
    expect(isMenuOpenAfterKey('a', false, false)).toBe(false);
  });

  it('leaves Escape to the dialog while the dialog is open', () => {
    expect(isMenuOpenAfterKey('Escape', true, true)).toBe(true);
  });

  it('keeps a closed menu closed', () => {
    expect(isMenuOpenAfterKey('Escape', false, false)).toBe(false);
  });
});

describe('selectBurgerLabelKey', () => {
  it('offers to close an open menu', () => {
    expect(selectBurgerLabelKey(true)).toBe('close-label');
  });

  it('offers to open a closed menu', () => {
    expect(selectBurgerLabelKey(false)).toBe('open-label');
  });
});

describe('canAnimateIn', () => {
  it('animates a tab that is on screen', () => {
    expect(canAnimateIn('visible', false)).toBe(true);
  });

  it('skips a tab that loaded in the background', () => {
    expect(canAnimateIn('hidden', false)).toBe(false);
  });

  it('skips the animation when the reader asked for less motion', () => {
    expect(canAnimateIn('visible', true)).toBe(false);
  });
});
