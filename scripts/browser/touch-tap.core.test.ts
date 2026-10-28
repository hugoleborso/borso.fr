import { describe, expect, it } from 'vitest';
import {
  findPageTarget,
  judgeTouchTap,
  parseCdpReply,
  parseRecordedEvents,
  parseTapPoint,
  parseTouchTapArguments,
} from './touch-tap.core';

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

const APP_PAGE = {
  type: 'page',
  url: 'http://localhost:5174/rehearsal',
  webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/A',
};

describe('findPageTarget', () => {
  it('returns the page whose url contains the part asked for', () => {
    const blankPage = { ...APP_PAGE, url: 'about:blank' };
    expect(findPageTarget([blankPage, APP_PAGE], 'localhost:5174')).toStrictEqual(APP_PAGE);
  });

  it('skips targets that are not pages, and pages missing a field', () => {
    const worker = { ...APP_PAGE, type: 'service_worker' };
    const pageWithoutUrl = { type: 'page', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/x' };
    expect(findPageTarget([worker, pageWithoutUrl, 'page'], '')).toBeNull();
  });

  it('returns null when no page matches', () => {
    expect(findPageTarget([APP_PAGE], 'localhost:9999')).toBeNull();
  });

  it('refuses a listing that is not an array', () => {
    expect(() => findPageTarget({ pages: [APP_PAGE] }, '')).toThrow();
  });
});

describe('parseCdpReply', () => {
  it('reads the value a Runtime.evaluate call returned', () => {
    expect(
      parseCdpReply(JSON.stringify({ id: 3, result: { result: { type: 'number', value: 7 } } })),
    ).toStrictEqual({ id: 3, result: { result: { value: 7 } } });
  });

  it('reads an error reply', () => {
    expect(parseCdpReply('{"id":4,"error":{"code":-32000,"message":"no node"}}')).toStrictEqual({
      id: 4,
      error: { message: 'no node' },
    });
  });

  it('reads an event, which carries no id', () => {
    expect(parseCdpReply('{"method":"Page.loadEventFired","params":{}}')).toStrictEqual({});
  });

  it.each([
    ['an id that is not a number', '{"id":"3"}'],
    ['an error with no message', '{"id":3,"error":{}}'],
    ['text that is not JSON', 'not json'],
  ])('refuses %s', (_label, message) => {
    expect(() => parseCdpReply(message)).toThrow();
  });
});

describe('parseTapPoint', () => {
  it('reads the centre the preparation script measured', () => {
    expect(parseTapPoint({ x: 187.5, y: 406 })).toStrictEqual({ x: 187.5, y: 406 });
  });

  it('returns null when the selector matched nothing', () => {
    expect(parseTapPoint(null)).toBeNull();
  });

  it('refuses a point with a coordinate that is not a number', () => {
    expect(() => parseTapPoint({ x: '187', y: 406 })).toThrow();
  });
});

describe('parseRecordedEvents', () => {
  it('reads the events the page recorded', () => {
    expect(parseRecordedEvents({ events: REAL_TAP, innerWidth: 375 })).toStrictEqual(REAL_TAP);
  });

  it('refuses an event missing a field the verdict reads', () => {
    expect(() =>
      parseRecordedEvents({ events: [{ type: 'click', pointerType: 'touch' }] }),
    ).toThrow();
  });

  it('refuses a log with no events', () => {
    expect(() => parseRecordedEvents({ innerWidth: 375 })).toThrow();
  });
});
