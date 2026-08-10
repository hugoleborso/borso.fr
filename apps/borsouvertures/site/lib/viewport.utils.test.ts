import { describe, expect, it } from 'vitest';
import { isCompactViewport, selectBoardWidth } from './viewport.utils';

describe('isCompactViewport', () => {
  it('treats a phone width as compact', () => {
    expect(isCompactViewport(375)).toBe(true);
  });

  it('treats the breakpoint itself as compact', () => {
    expect(isCompactViewport(900)).toBe(true);
  });

  it('treats a desktop width as not compact', () => {
    expect(isCompactViewport(901)).toBe(false);
  });
});

describe('selectBoardWidth', () => {
  it('gives a desktop viewport a share of its width', () => {
    expect(selectBoardWidth(1100)).toBe(660);
  });

  it('caps the board on a very wide viewport', () => {
    expect(selectBoardWidth(3000)).toBe(700);
  });

  it('leaves room for the page padding on a phone', () => {
    expect(selectBoardWidth(375)).toBe(327);
  });

  it('never goes below the minimum playable size', () => {
    expect(selectBoardWidth(280)).toBe(260);
  });

  it('never goes negative when the viewport is narrower than the padding', () => {
    expect(selectBoardWidth(0)).toBe(260);
  });

  it('uses the desktop share from the breakpoint upwards', () => {
    expect(selectBoardWidth(1024)).toBe(1024 * 0.6);
  });
});
