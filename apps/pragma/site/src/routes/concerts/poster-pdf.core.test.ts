import { describe, expect, it } from 'vitest';
import {
  findContentBounds,
  FRINGE_LIGHTNESS_STEP,
  FRINGE_LINE_SHARE,
  FRINGE_MAX_DEPTH,
  isBlankPixel,
  NEAR_WHITE_CHANNEL_MIN,
  POSTER_PIXEL_BUDGET,
  selectRenderScale,
  trimAntialiasedFringe,
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

const GREY_OF: Readonly<Record<string, number>> = {
  '.': 255,
  w: NEAR_WHITE_CHANNEL_MIN - 1,
  f: 220,
  g: 140,
  m: 127,
  l: 230,
  s: 20 + FRINGE_LIGHTNESS_STEP,
  t: 20 + FRINGE_LIGHTNESS_STEP - 1,
  '#': 20,
};

function draw(rows: readonly string[]) {
  const width = rows[0]?.length ?? 0;
  const pixels = new Uint8ClampedArray(width * rows.length * 4);
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const grey = GREY_OF[rows[y]?.charAt(x) ?? ''] ?? 0;
      pixels.set([grey, grey, grey, 255], (y * width + x) * 4);
    }
  }
  return { pixels, width, bounds: findContentBounds(pixels, width, rows.length) };
}

function trim(rows: readonly string[]) {
  const { pixels, width, bounds } = draw(rows);
  return trimAntialiasedFringe(pixels, width, bounds);
}

describe('trimming the anti-aliased fringe a page leaves around a poster', () => {
  it('drops a one or two pixel grey fringe left of the poster', () => {
    expect(trim(['.fg###.', '.fg###.', '.fg###.'])).toStrictEqual({
      x: 3,
      y: 0,
      width: 3,
      height: 3,
    });
    expect(trim(['.f###', '.f###', '.f###'])).toStrictEqual({ x: 2, y: 0, width: 3, height: 3 });
  });

  it('drops a mid-grey fringe on the right, the top and the bottom', () => {
    expect(trim(['.....', '.mmf.', '.##m.', '.##m.', '.mmf.', '.....'])).toStrictEqual({
      x: 1,
      y: 2,
      width: 2,
      height: 2,
    });
  });

  it('shaves at most a couple of lines off a side that keeps getting lighter', () => {
    expect(FRINGE_MAX_DEPTH).toBe(2);
    expect(trim(['wfg#', 'wfg#', 'wfg#'])).toStrictEqual({ x: 2, y: 0, width: 2, height: 3 });
  });

  it('keeps a poster whose own edge is light, as long as the inside is as light', () => {
    expect(trim(['.lll#', '.lll#', '.lll#'])).toStrictEqual({ x: 1, y: 0, width: 4, height: 3 });
  });

  it('calls a line fringe only when more than half of it is lighter than the line inside', () => {
    expect(FRINGE_LINE_SHARE).toBe(0.5);
    expect(trim(['f#', '##', 'f#', '##'])).toStrictEqual({ x: 0, y: 0, width: 2, height: 4 });
    expect(trim(['f#', 'f#', 'f#', '##'])).toStrictEqual({ x: 1, y: 0, width: 1, height: 4 });
    expect(trim(['f#', '##', '##', 'f#', 'f#'])).toStrictEqual({ x: 1, y: 0, width: 1, height: 5 });
  });

  it('calls a pixel lighter only from a full step above the one inside it', () => {
    expect(trim(['s#', 's#'])).toStrictEqual({ x: 1, y: 0, width: 1, height: 2 });
    expect(trim(['t#', 't#'])).toStrictEqual({ x: 0, y: 0, width: 2, height: 2 });
  });

  it('reads a pixel by its darkest channel, so one colour channel is enough to make it ink', () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 20, 255, 20, 20, 20, 255, 255, 20, 255, 255, 20, 20, 20, 255, 20, 255, 255, 255, 20,
      20, 20, 255,
    ]);
    expect(trimAntialiasedFringe(pixels, 2, { x: 0, y: 0, width: 2, height: 3 })).toStrictEqual({
      x: 0,
      y: 0,
      width: 2,
      height: 3,
    });
  });

  it('drops the fringe of a poster set low and right on the page', () => {
    expect(trim(['....', '....', '....', '.f##', '.f##'])).toStrictEqual({
      x: 2,
      y: 3,
      width: 2,
      height: 2,
    });
  });

  it('never trims a poster set away from the page corner down to nothing', () => {
    const across = draw(['..wfg']);
    expect(
      trimAntialiasedFringe(across.pixels, 5, { x: 2, y: 0, width: 2, height: 1 }),
    ).toStrictEqual({ x: 3, y: 0, width: 1, height: 1 });
    const leftward = draw(['.#gfw']);
    expect(
      trimAntialiasedFringe(leftward.pixels, 5, { x: 3, y: 0, width: 2, height: 1 }),
    ).toStrictEqual({ x: 3, y: 0, width: 1, height: 1 });
    const downward = draw(['.', 'w', 'f', 'g']);
    expect(
      trimAntialiasedFringe(downward.pixels, 1, { x: 0, y: 1, width: 1, height: 2 }),
    ).toStrictEqual({
      x: 0,
      y: 2,
      width: 1,
      height: 1,
    });
    const upward = draw(['.', '#', 'g', 'f', 'w']);
    expect(
      trimAntialiasedFringe(upward.pixels, 1, { x: 0, y: 3, width: 1, height: 2 }),
    ).toStrictEqual({
      x: 0,
      y: 3,
      width: 1,
      height: 1,
    });
  });

  it('never trims a poster down to nothing', () => {
    expect(trim(['.f.', '.f.'])).toStrictEqual({ x: 1, y: 0, width: 1, height: 2 });
    const { pixels } = draw(['wfg#']);
    expect(trimAntialiasedFringe(pixels, 4, { x: 0, y: 0, width: 2, height: 1 })).toStrictEqual({
      x: 1,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(trim(['f', '#'])).toStrictEqual({ x: 0, y: 1, width: 1, height: 1 });
    expect(trim(['#', 'f'])).toStrictEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(trim(['#f'])).toStrictEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});
