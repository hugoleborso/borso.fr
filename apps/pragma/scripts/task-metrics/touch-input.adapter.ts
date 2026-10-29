import { z } from 'zod';
import type { CdpSession } from './cdp-session.adapter';

const TOUCH_RADIUS = 12;
const TOUCH_STEP_MS = 60;
const DRAG_STEPS = 10;
const SCROLL_SOURCE_HEADLESS_CHROMIUM_HONOURS = 'mouse';
const READ_VIEWPORT = '() => [innerWidth, innerHeight]';
const viewportSchema = z.tuple([z.number(), z.number()]);
const KEY_CODES = { Enter: 13, Escape: 27, Tab: 9 } as const;

export type NamedKey = keyof typeof KEY_CODES;

export interface ViewportFractionPoint {
  readonly x: number;
  readonly y: number;
}

interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readViewport(session: CdpSession): Promise<readonly [number, number]> {
  return viewportSchema.parse(await session.evaluate(READ_VIEWPORT));
}

async function toPixels(session: CdpSession, point: ViewportFractionPoint): Promise<PixelPoint> {
  const [width, height] = await readViewport(session);
  return { x: point.x * width, y: point.y * height };
}

function sendTouch(
  session: CdpSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  pixel?: PixelPoint,
): Promise<unknown> {
  const touchPoints =
    pixel === undefined
      ? []
      : [{ x: pixel.x, y: pixel.y, radiusX: TOUCH_RADIUS, radiusY: TOUCH_RADIUS, force: 1 }];
  return session.send('Input.dispatchTouchEvent', { type, touchPoints });
}

// @FollowsBlueprint adapter-external-service
export async function tapAt(session: CdpSession, point: ViewportFractionPoint): Promise<void> {
  const pixel = await toPixels(session, point);
  await sendTouch(session, 'touchStart', pixel);
  await pause(TOUCH_STEP_MS);
  await sendTouch(session, 'touchEnd');
}

export async function scrollAt(
  session: CdpSession,
  point: ViewportFractionPoint,
  screenHeightsDown: number,
): Promise<void> {
  const [width, height] = await readViewport(session);
  await session.send('Input.synthesizeScrollGesture', {
    x: point.x * width,
    y: point.y * height,
    yDistance: -screenHeightsDown * height,
    gestureSourceType: SCROLL_SOURCE_HEADLESS_CHROMIUM_HONOURS,
  });
}

export async function dragBetween(
  session: CdpSession,
  origin: ViewportFractionPoint,
  destination: ViewportFractionPoint,
): Promise<void> {
  const start = await toPixels(session, origin);
  const end = await toPixels(session, destination);
  await sendTouch(session, 'touchStart', start);
  for (let step = 1; step <= DRAG_STEPS; step += 1) {
    await pause(TOUCH_STEP_MS);
    const share = step / DRAG_STEPS;
    await sendTouch(session, 'touchMove', {
      x: start.x + (end.x - start.x) * share,
      y: start.y + (end.y - start.y) * share,
    });
  }
  await pause(TOUCH_STEP_MS);
  await sendTouch(session, 'touchEnd');
}

export async function typeText(session: CdpSession, text: string): Promise<void> {
  await session.send('Input.insertText', { text });
}

export async function pressKey(session: CdpSession, key: NamedKey): Promise<void> {
  const keyEvent = { key, code: key, windowsVirtualKeyCode: KEY_CODES[key] };
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', ...keyEvent });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', ...keyEvent });
}
