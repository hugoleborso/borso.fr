import { afterEach, describe, expect, it } from 'vitest';
import {
  BOTTOM_GAP_PROPERTY,
  pinBottomBarsToVisualViewport,
  type VisibleArea,
} from './visual-viewport.adapter';

const SCREEN_HEIGHT = 800;
const KEYBOARD_HEIGHT = 300;

interface MovableArea extends VisibleArea {
  offsetTop: number;
  height: number;
}

function visibleArea(offsetTop: number, height: number): MovableArea {
  return Object.assign(new EventTarget(), { offsetTop, height });
}

function readBottomGap(): string {
  return document.documentElement.style.getPropertyValue(BOTTOM_GAP_PROPERTY);
}

describe('pinBottomBarsToVisualViewport', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty(BOTTOM_GAP_PROPERTY);
  });

  it('writes no gap while the visible area fills the layout viewport', () => {
    const area = visibleArea(0, SCREEN_HEIGHT);

    pinBottomBarsToVisualViewport({ innerHeight: SCREEN_HEIGHT, visualViewport: area, document });

    expect(readBottomGap()).toBe('0px');
  });

  it('lifts the bars to the bottom of the visible area when the keyboard shrinks it', () => {
    const area = visibleArea(0, SCREEN_HEIGHT);
    pinBottomBarsToVisualViewport({ innerHeight: SCREEN_HEIGHT, visualViewport: area, document });

    area.height = SCREEN_HEIGHT - KEYBOARD_HEIGHT;
    area.dispatchEvent(new Event('resize'));

    expect(readBottomGap()).toBe(`${KEYBOARD_HEIGHT}px`);
  });

  it('follows the visible area as it scrolls over the layout viewport', () => {
    const area = visibleArea(0, SCREEN_HEIGHT - KEYBOARD_HEIGHT);
    pinBottomBarsToVisualViewport({ innerHeight: SCREEN_HEIGHT, visualViewport: area, document });

    area.offsetTop = 120;
    area.dispatchEvent(new Event('scroll'));

    expect(readBottomGap()).toBe('180px');
  });

  it('pulls the bars down when the layout viewport stays shorter than the screen', () => {
    const area = visibleArea(0, SCREEN_HEIGHT);

    pinBottomBarsToVisualViewport({
      innerHeight: SCREEN_HEIGHT - KEYBOARD_HEIGHT,
      visualViewport: area,
      document,
    });

    expect(readBottomGap()).toBe(`-${KEYBOARD_HEIGHT}px`);
  });

  it('leaves the bars on the layout viewport in a browser with no visual viewport', () => {
    pinBottomBarsToVisualViewport({ innerHeight: SCREEN_HEIGHT, visualViewport: null, document });

    expect(readBottomGap()).toBe('');
  });
});
