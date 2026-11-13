import { describe, expect, it } from 'vitest';
import { isCompactViewport, selectBoardWidth, selectNameCardBoardWidth } from './viewport.utils';

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

// @FollowsBlueprint test-pure-unit
describe('selectBoardWidth', () => {
  it('gives a desktop viewport half its width, beside the card column', () => {
    expect(selectBoardWidth(1100)).toBe(550);
  });

  it('uses the desktop share from the breakpoint upwards', () => {
    expect(selectBoardWidth(1024)).toBe(512);
  });

  it('caps the board on a very wide viewport', () => {
    expect(selectBoardWidth(3000)).toBe(560);
  });

  it('caps the board on a tablet just below the desktop breakpoint', () => {
    expect(selectBoardWidth(1023)).toBe(560);
  });

  it('leaves room for the page padding from the roomy breakpoint upwards', () => {
    expect(selectBoardWidth(601)).toBe(553);
  });

  it('spans the whole width of a phone, edge to edge', () => {
    expect(selectBoardWidth(375)).toBe(375);
    expect(selectBoardWidth(600)).toBe(560);
  });

  it('never goes below the minimum playable size', () => {
    expect(selectBoardWidth(250)).toBe(260);
  });

  it('never goes negative on an empty viewport', () => {
    expect(selectBoardWidth(0)).toBe(260);
  });
});

describe('selectNameCardBoardWidth', () => {
  it('shrinks the board on a phone so the band and the four names fit above the action bar', () => {
    expect(selectNameCardBoardWidth(375)).toBe(288);
    expect(selectNameCardBoardWidth(600)).toBe(288);
  });

  it('keeps the full board from the roomy breakpoint upwards, where the action bar sits inline', () => {
    expect(selectNameCardBoardWidth(601)).toBe(553);
    expect(selectNameCardBoardWidth(1100)).toBe(550);
  });
});
