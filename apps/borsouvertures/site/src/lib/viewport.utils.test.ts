import { describe, expect, it } from 'vitest';
import { selectBoardWidth } from './viewport.utils';

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
