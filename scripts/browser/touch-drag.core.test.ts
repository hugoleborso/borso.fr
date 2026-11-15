import { describe, expect, it } from 'vitest';
import {
  interpolateDragPath,
  judgeTouchDrag,
  parseDragEnds,
  isOverDestination,
  parseTouchDragArguments,
  TOUCH_DRAG_BINDING,
} from './touch-drag.core';
import { readReportedEvent } from './touch-tap.core';

const PIECE_DRAG = [
  { type: 'pointerdown', pointerType: 'touch', isOnTarget: true },
  { type: 'touchstart', pointerType: '', isOnTarget: true },
  { type: 'touchmove', pointerType: '', isOnTarget: true },
  { type: 'pointerup', pointerType: 'touch', isOnTarget: true },
  { type: 'touchend', pointerType: '', isOnTarget: true },
];

describe('judgeTouchDrag', () => {
  it('accepts a drag the page held from the from element to the to element', () => {
    expect(judgeTouchDrag(PIECE_DRAG, true)).toStrictEqual({ isRealDrag: true, problems: [] });
  });

  it('accepts moves and a lift reported with a target outside the from element', () => {
    const elsewhere = PIECE_DRAG.map((event) =>
      event.type === 'touchstart' ? event : { ...event, isOnTarget: false },
    );
    expect(judgeTouchDrag(elsewhere, true).isRealDrag).toBe(true);
  });

  it('refuses a drag that started on another element and never moved or lifted', () => {
    expect(
      judgeTouchDrag([{ type: 'touchstart', pointerType: '', isOnTarget: false }], true),
    ).toStrictEqual({
      isRealDrag: false,
      problems: [
        'no touchstart reached the from element',
        'no touchmove fired',
        'no touchend fired',
      ],
    });
  });

  it('refuses a drag the browser took to pan the page, measured on an element with no listener', () => {
    const panned = [
      ...PIECE_DRAG,
      { type: 'pointercancel', pointerType: 'touch', isOnTarget: false },
    ];
    expect(judgeTouchDrag(panned, true)).toStrictEqual({
      isRealDrag: false,
      problems: [
        'the browser cancelled the touch to pan or zoom, so the page did not hold the drag',
      ],
    });
  });

  it('refuses a drag that lifted somewhere other than the to element', () => {
    expect(judgeTouchDrag(PIECE_DRAG, false)).toStrictEqual({
      isRealDrag: false,
      problems: ['the touch did not lift over the to element'],
    });
  });
});

describe('interpolateDragPath', () => {
  it('steps evenly from just past the start to exactly the end', () => {
    expect(interpolateDragPath({ x: 70, y: 110 }, { x: 282, y: 442 }, 4)).toStrictEqual([
      { x: 123, y: 193 },
      { x: 176, y: 276 },
      { x: 229, y: 359 },
      { x: 282, y: 442 },
    ]);
  });

  it('moves straight to the end in one step', () => {
    expect(interpolateDragPath({ x: 0, y: 0 }, { x: 10, y: -10 }, 1)).toStrictEqual([
      { x: 10, y: -10 },
    ]);
  });
});

describe('parseDragEnds', () => {
  it('reads both centres the preparation script measured', () => {
    expect(parseDragEnds({ from: { x: 70, y: 110 }, to: { x: 282, y: 442 } })).toStrictEqual({
      from: { x: 70, y: 110 },
      to: { x: 282, y: 442 },
    });
  });

  it('keeps the end whose selector matched nothing as null', () => {
    expect(parseDragEnds({ from: null, to: { x: 1, y: 2 } })).toStrictEqual({
      from: null,
      to: { x: 1, y: 2 },
    });
  });

  it('refuses a value that is not a pair of ends', () => {
    expect(() => parseDragEnds(null)).toThrow();
    expect(() => parseDragEnds({ from: { x: '70', y: 110 }, to: null })).toThrow();
  });
});

describe('isOverDestination', () => {
  it('reads the answer of the hit test', () => {
    expect(isOverDestination(true)).toBe(true);
    expect(isOverDestination(false)).toBe(false);
  });

  it('refuses anything that is not a boolean', () => {
    expect(() => isOverDestination('true')).toThrow();
  });
});

describe('parseTouchDragArguments', () => {
  it('needs a from and a to selector', () => {
    expect(parseTouchDragArguments([])).toBeNull();
    expect(parseTouchDragArguments(['--from', '#a'])).toBeNull();
    expect(parseTouchDragArguments(['--to', '#b'])).toBeNull();
    expect(parseTouchDragArguments(['--from', '', '--to', '#b'])).toBeNull();
    expect(parseTouchDragArguments(['--from', '#a', '--to', ''])).toBeNull();
  });

  it('defaults to eight steps on a 375 by 812 phone on CDP 9222, on whichever page comes first', () => {
    expect(parseTouchDragArguments(['--from', '#a', '--to', '#b'])).toStrictEqual({
      fromSelector: '#a',
      toSelector: '#b',
      steps: 8,
      port: 9222,
      pageUrlPart: '',
      width: 375,
      height: 812,
    });
  });

  it('reads every flag', () => {
    expect(
      parseTouchDragArguments([
        '--from',
        '[data-square="e2"] [data-piece]',
        '--to',
        '[data-square="e4"]',
        '--steps',
        '12',
        '--port',
        '9333',
        '--page',
        'localhost:5173',
        '--width',
        '390',
        '--height',
        '844',
      ]),
    ).toStrictEqual({
      fromSelector: '[data-square="e2"] [data-piece]',
      toSelector: '[data-square="e4"]',
      steps: 12,
      port: 9333,
      pageUrlPart: 'localhost:5173',
      width: 390,
      height: 844,
    });
  });
});

describe('readReportedEvent with the drag binding', () => {
  const event = { type: 'touchmove', pointerType: '', isOnTarget: true };

  function bindingMessage(name: string): string {
    return JSON.stringify({
      method: 'Runtime.bindingCalled',
      params: { name, payload: JSON.stringify(event) },
    });
  }

  it('reads an event reported through the drag binding', () => {
    expect(readReportedEvent(bindingMessage(TOUCH_DRAG_BINDING), TOUCH_DRAG_BINDING)).toStrictEqual(
      event,
    );
  });

  it('ignores a tap report while reading the drag binding', () => {
    expect(readReportedEvent(bindingMessage('__touchTapReport'), TOUCH_DRAG_BINDING)).toBeNull();
  });
});
