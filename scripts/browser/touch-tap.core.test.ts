import { describe, expect, it } from 'vitest';
import { judgeTouchTap, parseTouchTapArguments } from './touch-tap.core';

const REAL_TAP = [
  { type: 'pointerdown', pointerType: 'touch', isOnTarget: true },
  { type: 'touchstart', pointerType: '', isOnTarget: true },
  { type: 'touchend', pointerType: '', isOnTarget: true },
  { type: 'click', pointerType: 'touch', isOnTarget: true },
];

describe('judgeTouchTap', () => {
  it('accepts a tap that arrived as touch on the target', () => {
    expect(judgeTouchTap(REAL_TAP)).toStrictEqual({ isRealTouch: true, problems: [] });
  });

  it('refuses the mouse press argent 0.22.1 to 0.30.1 send for gesture-tap on Chromium', () => {
    expect(
      judgeTouchTap([
        { type: 'pointerdown', pointerType: 'mouse', isOnTarget: true },
        { type: 'click', pointerType: 'mouse', isOnTarget: true },
      ]),
    ).toStrictEqual({
      isRealTouch: false,
      problems: [
        'no touchstart reached the target',
        'no pointerdown with pointerType touch reached the target',
        'no click with pointerType touch reached the target',
      ],
    });
  });

  it('refuses a touch that landed on something other than the target', () => {
    const missed = REAL_TAP.map((event) => ({ ...event, isOnTarget: false }));
    expect(judgeTouchTap(missed).isRealTouch).toBe(false);
  });
});

describe('parseTouchTapArguments', () => {
  it('needs a selector', () => {
    expect(parseTouchTapArguments([])).toBeNull();
    expect(parseTouchTapArguments(['--selector', ''])).toBeNull();
  });

  it('defaults to a 375 by 812 phone on CDP 9222, on whichever page comes first', () => {
    expect(parseTouchTapArguments(['--selector', 'button'])).toStrictEqual({
      selector: 'button',
      port: 9222,
      pageUrlPart: '',
      width: 375,
      height: 812,
    });
  });

  it('reads every flag', () => {
    expect(
      parseTouchTapArguments([
        '--selector',
        '[aria-label="Stop"]',
        '--port',
        '9333',
        '--page',
        'localhost:5174',
        '--width',
        '390',
        '--height',
        '844',
      ]),
    ).toStrictEqual({
      selector: '[aria-label="Stop"]',
      port: 9333,
      pageUrlPart: 'localhost:5174',
      width: 390,
      height: 844,
    });
  });

  it.each([['0'], ['-1'], ['1.5'], ['wide']])('falls back on a width of %s', (width) => {
    expect(parseTouchTapArguments(['--selector', 'a', '--width', width])?.width).toBe(375);
  });
});
