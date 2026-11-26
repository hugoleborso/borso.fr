/** @Feature concert-registrations */

export interface PixelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const NEAR_WHITE_CHANNEL_MIN = 245;
export const POSTER_PIXEL_BUDGET = 3_000_000;
export const FRINGE_LIGHTNESS_STEP = 16;
export const FRINGE_LINE_SHARE = 0.5;
export const FRINGE_MAX_DEPTH = 2;

const CHANNELS_PER_PIXEL = 4;
const OPAQUE = 255;
const TRANSPARENT = 0;
const NO_CONTENT = -1;
const COLOR_CHANNELS = 3;

export function isBlankPixel(pixels: Uint8ClampedArray, offset: number): boolean {
  const [red = 0, green = 0, blue = 0, alpha = OPAQUE] = pixels.subarray(
    offset,
    offset + CHANNELS_PER_PIXEL,
  );
  if (alpha === TRANSPARENT) return true;
  return Math.min(red, green, blue) >= NEAR_WHITE_CHANNEL_MIN;
}

// @FollowsBlueprint core-decision
export function findContentBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PixelBounds {
  let left = width;
  let right = NO_CONTENT;
  let top = height;
  let bottom = NO_CONTENT;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isBlankPixel(pixels, (y * width + x) * CHANNELS_PER_PIXEL)) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right === NO_CONTENT) return { x: 0, y: 0, width, height };
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function darkestChannel(pixels: Uint8ClampedArray, offset: number): number {
  return Math.min(...pixels.subarray(offset, offset + COLOR_CHANNELS));
}

function isFringeLine(
  pixels: Uint8ClampedArray,
  edgeOffsets: readonly number[],
  inwardStride: number,
): boolean {
  const lighter = edgeOffsets.filter(
    (offset) =>
      darkestChannel(pixels, offset) >=
      darkestChannel(pixels, offset + inwardStride) + FRINGE_LIGHTNESS_STEP,
  );
  return lighter.length > edgeOffsets.length * FRINGE_LINE_SHARE;
}

function columnOffsets(width: number, column: number, top: number, bottom: number): number[] {
  return Array.from(
    { length: bottom - top + 1 },
    (_, index) => ((top + index) * width + column) * CHANNELS_PER_PIXEL,
  );
}

function rowOffsets(width: number, row: number, left: number, right: number): number[] {
  return Array.from(
    { length: right - left + 1 },
    (_, index) => (row * width + left + index) * CHANNELS_PER_PIXEL,
  );
}

function fringeDepth(span: number, isFringeAt: (depth: number) => boolean): number {
  let depth = 0;
  while (depth < FRINGE_MAX_DEPTH && depth + 1 < span && isFringeAt(depth)) depth += 1;
  return depth;
}

// @FollowsBlueprint core-decision
export function trimAntialiasedFringe(
  pixels: Uint8ClampedArray,
  width: number,
  bounds: PixelBounds,
): PixelBounds {
  const column = CHANNELS_PER_PIXEL;
  const row = width * CHANNELS_PER_PIXEL;
  let left = bounds.x;
  let right = bounds.x + bounds.width - 1;
  let top = bounds.y;
  let bottom = bounds.y + bounds.height - 1;
  left += fringeDepth(right - left + 1, (depth) =>
    isFringeLine(pixels, columnOffsets(width, left + depth, top, bottom), column),
  );
  right -= fringeDepth(right - left + 1, (depth) =>
    isFringeLine(pixels, columnOffsets(width, right - depth, top, bottom), -column),
  );
  top += fringeDepth(bottom - top + 1, (depth) =>
    isFringeLine(pixels, rowOffsets(width, top + depth, left, right), row),
  );
  bottom -= fringeDepth(bottom - top + 1, (depth) =>
    isFringeLine(pixels, rowOffsets(width, bottom - depth, left, right), -row),
  );
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function selectRenderScale(
  pageWidth: number,
  pageHeight: number,
  pixelBudget: number = POSTER_PIXEL_BUDGET,
): number {
  return Math.sqrt(pixelBudget / (pageWidth * pageHeight));
}
