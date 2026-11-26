/** @Feature concert-registrations */

export interface PixelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const NEAR_WHITE_CHANNEL_MIN = 245;
export const POSTER_PIXEL_BUDGET = 3_000_000;

const CHANNELS_PER_PIXEL = 4;
const OPAQUE = 255;
const TRANSPARENT = 0;
const NO_CONTENT = -1;

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

export function selectRenderScale(
  pageWidth: number,
  pageHeight: number,
  pixelBudget: number = POSTER_PIXEL_BUDGET,
): number {
  return Math.sqrt(pixelBudget / (pageWidth * pageHeight));
}
