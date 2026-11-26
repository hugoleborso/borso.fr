import { describe, expect, it } from 'vitest';
import {
  findContentBounds,
  isBlankPixel,
  NEAR_WHITE_CHANNEL_MIN,
  POSTER_PIXEL_BUDGET,
  selectRenderScale,
} from './poster-pdf.core';

const WHITE = [255, 255, 255, 255] as const;
const INK = [20, 20, 20, 255] as const;

function paint(width: number, height: number, inked: readonly (readonly [number, number])[]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) pixels.set(WHITE, index * 4);
  for (const [x, y] of inked) pixels.set(INK, (y * width + x) * 4);
  return pixels;
}

// @FollowsBlueprint test-pure-unit
describe('trimming the white margins of a poster page', () => {
  it('counts a near-white or a transparent pixel as margin, and any darker channel as content', () => {
    const edge = NEAR_WHITE_CHANNEL_MIN;
    expect(isBlankPixel(new Uint8ClampedArray([edge, edge, edge, 255]), 0)).toBe(true);
    expect(isBlankPixel(new Uint8ClampedArray([edge - 1, 255, 255, 255]), 0)).toBe(false);
    expect(isBlankPixel(new Uint8ClampedArray([255, edge - 1, 255, 255]), 0)).toBe(false);
    expect(isBlankPixel(new Uint8ClampedArray([255, 255, edge - 1, 255]), 0)).toBe(false);
    expect(isBlankPixel(new Uint8ClampedArray([0, 0, 0, 0]), 0)).toBe(true);
    expect(isBlankPixel(new Uint8ClampedArray([0, 0, 0, 1]), 0)).toBe(false);
    expect(isBlankPixel(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]), 4)).toBe(false);
  });

  it('reads a pixel past the end of the page as content, so a scan never runs off the page', () => {
    expect(isBlankPixel(new Uint8ClampedArray([255, 255, 255, 255]), 4)).toBe(false);
  });

  it('keeps the smallest box around every inked pixel', () => {
    expect(
      findContentBounds(
        paint(6, 5, [
          [2, 1],
          [4, 3],
          [3, 2],
        ]),
        6,
        5,
      ),
    ).toStrictEqual({
      x: 2,
      y: 1,
      width: 3,
      height: 3,
    });
    expect(findContentBounds(paint(4, 3, [[0, 0]]), 4, 3)).toStrictEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(
      findContentBounds(
        paint(4, 3, [
          [3, 2],
          [1, 0],
        ]),
        4,
        3,
      ),
    ).toStrictEqual({
      x: 1,
      y: 0,
      width: 3,
      height: 3,
    });
  });

  it('keeps the whole page when nothing is inked', () => {
    expect(findContentBounds(paint(3, 2, []), 3, 2)).toStrictEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 2,
    });
  });

  it('scales a page so its drawing fits the pixel budget', () => {
    expect(selectRenderScale(1_000, 750)).toBeCloseTo(2, 5);
    expect(selectRenderScale(200, 50, 40_000)).toBe(2);
    expect(POSTER_PIXEL_BUDGET).toBe(3_000_000);
  });
});
