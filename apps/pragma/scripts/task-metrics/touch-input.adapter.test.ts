import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpSession } from './cdp-session.adapter';
import { dragBetween, pressKey, scrollAt, tapAt, typeText } from './touch-input.adapter';

interface SentCall {
  readonly at: number;
  readonly method: string;
  readonly parameters: Record<string, unknown> | undefined;
}

const VIEWPORT_WIDTH = 400;
const VIEWPORT_HEIGHT = 800;

function createRecordingSession(viewport: unknown = [VIEWPORT_WIDTH, VIEWPORT_HEIGHT]): {
  readonly session: CdpSession;
  readonly sent: SentCall[];
  readonly evaluated: string[];
} {
  const sent: SentCall[] = [];
  const evaluated: string[] = [];
  const session: CdpSession = {
    send: (method, parameters) => {
      sent.push({ at: Date.now(), method, parameters });
      return Promise.resolve({});
    },
    listen: ignoreEvents,
    evaluate: (functionSource) => {
      evaluated.push(functionSource);
      return Promise.resolve(viewport);
    },
    close: () => undefined,
  };
  return { session, sent, evaluated };
}

async function settle(gesture: Promise<void>): Promise<void> {
  await vi.runAllTimersAsync();
  await gesture;
}

function touchAt(left: number, top: number): Record<string, number> {
  return { x: left, y: top, radiusX: 12, radiusY: 12, force: 1 };
}

function stopListening(): void {
  return undefined;
}

function ignoreEvents(): () => void {
  return stopListening;
}

describe('touch input', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('taps as a touch start then, 60 ms later, a touch end, at the viewport fraction', async () => {
    const { session, sent, evaluated } = createRecordingSession();
    await settle(tapAt(session, { x: 0.25, y: 0.5 }));
    expect(evaluated).toEqual(['() => [innerWidth, innerHeight]']);
    expect(sent).toEqual([
      {
        at: 0,
        method: 'Input.dispatchTouchEvent',
        parameters: { type: 'touchStart', touchPoints: [touchAt(100, 400)] },
      },
      {
        at: 60,
        method: 'Input.dispatchTouchEvent',
        parameters: { type: 'touchEnd', touchPoints: [] },
      },
    ]);
  });

  it('refuses a viewport the page did not report as two numbers', async () => {
    const { session } = createRecordingSession(['390', 844]);
    await expect(tapAt(session, { x: 0, y: 0 })).rejects.toThrow();
  });

  it('scrolls down by a wheel-style gesture that moves the content up', async () => {
    const { session, sent } = createRecordingSession();
    await settle(scrollAt(session, { x: 0.5, y: 0.25 }, 0.5));
    expect(sent).toEqual([
      {
        at: 0,
        method: 'Input.synthesizeScrollGesture',
        parameters: { x: 200, y: 200, yDistance: -400, gestureSourceType: 'mouse' },
      },
    ]);
  });

  it('drags in ten touch moves 60 ms apart, from the origin to the destination', async () => {
    const { session, sent } = createRecordingSession();
    await settle(dragBetween(session, { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.25 }));
    const moves = Array.from({ length: 10 }, (_, index) => ({
      at: (index + 1) * 60,
      method: 'Input.dispatchTouchEvent',
      parameters: {
        type: 'touchMove',
        touchPoints: [touchAt(100 + (index + 1) * 20, 400 - (index + 1) * 20)],
      },
    }));
    expect(sent).toEqual([
      {
        at: 0,
        method: 'Input.dispatchTouchEvent',
        parameters: { type: 'touchStart', touchPoints: [touchAt(100, 400)] },
      },
      ...moves,
      {
        at: 660,
        method: 'Input.dispatchTouchEvent',
        parameters: { type: 'touchEnd', touchPoints: [] },
      },
    ]);
  });

  it('types text as one insertion, accents included', async () => {
    const { session, sent } = createRecordingSession();
    await settle(typeText(session, 'Enchaîner'));
    expect(sent).toEqual([
      { at: 0, method: 'Input.insertText', parameters: { text: 'Enchaîner' } },
    ]);
  });

  it.each([
    ['Enter', 13],
    ['Escape', 27],
    ['Tab', 9],
  ] as const)('presses %s as a key down then a key up', async (key, code) => {
    const { session, sent } = createRecordingSession();
    await settle(pressKey(session, key));
    const keyEvent = { key, code: key, windowsVirtualKeyCode: code };
    expect(sent).toEqual([
      { at: 0, method: 'Input.dispatchKeyEvent', parameters: { type: 'keyDown', ...keyEvent } },
      { at: 0, method: 'Input.dispatchKeyEvent', parameters: { type: 'keyUp', ...keyEvent } },
    ]);
  });
});
