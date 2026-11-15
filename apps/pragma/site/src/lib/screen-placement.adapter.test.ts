import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BreachReporter,
  SETTLE_DELAY_MS,
  watchScreenPlacement,
} from './screen-placement.adapter';

const SCREEN_HEIGHT = 800;
const KEYBOARD_TOP = 500;

interface MovableArea extends EventTarget {
  offsetTop: number;
  height: number;
}

function visibleArea(height: number): MovableArea {
  return Object.assign(new EventTarget(), { offsetTop: 0, height });
}

function placedElement<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  top: number,
  bottom: number,
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  const box = DOMRect.fromRect({ x: 0, y: top, width: 375, height: bottom - top });
  return Object.assign(element, { getBoundingClientRect: () => box });
}

function mountTabBar(top: number, bottom: number): void {
  const tabBar = placedElement('nav', top, bottom);
  tabBar.dataset.bottomBar = '';
  document.body.append(tabBar);
}

function focusFieldAt(tag: 'input' | 'textarea', top: number): void {
  const field = placedElement(tag, top, top + 40);
  document.body.append(field);
  field.focus();
}

describe('watchScreenPlacement', () => {
  let report: ReturnType<typeof vi.fn<BreachReporter>>;

  beforeEach(() => {
    vi.useFakeTimers();
    report = vi.fn<BreachReporter>();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('does nothing without a visual viewport', () => {
    expect(() => watchScreenPlacement({ visualViewport: null, document }, report)).not.toThrow();
  });

  it('reports a tab bar left under the keyboard once the screen settles', () => {
    const area = visibleArea(SCREEN_HEIGHT);
    mountTabBar(744, 800);
    watchScreenPlacement({ visualViewport: area, document }, report);

    area.height = KEYBOARD_TOP;
    area.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(SETTLE_DELAY_MS - 1);
    expect(report).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(report).toHaveBeenCalledExactlyOnceWith('tab-bar-off-visible-bottom', {
      element: { top: 744, bottom: 800 },
      visible: { top: 0, bottom: KEYBOARD_TOP },
    });
  });

  it('checks again after the visible screen scrolls', () => {
    const area = visibleArea(SCREEN_HEIGHT);
    mountTabBar(744, 800);
    watchScreenPlacement({ visualViewport: area, document }, report);

    area.offsetTop = 60;
    area.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).toHaveBeenCalledWith('tab-bar-off-visible-bottom', expect.anything());
  });

  it('reports nothing while the tab bar rests on the visible bottom', () => {
    const area = visibleArea(SCREEN_HEIGHT);
    mountTabBar(744, 800);
    watchScreenPlacement({ visualViewport: area, document }, report);

    area.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).not.toHaveBeenCalled();
  });

  it('reports a breach once per page load', () => {
    const area = visibleArea(KEYBOARD_TOP);
    mountTabBar(744, 800);
    watchScreenPlacement({ visualViewport: area, document }, report);

    area.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(SETTLE_DELAY_MS);
    area.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).toHaveBeenCalledOnce();
  });

  it('reports a focused text area left under the keyboard', () => {
    const area = visibleArea(KEYBOARD_TOP);
    watchScreenPlacement({ visualViewport: area, document }, report);

    focusFieldAt('textarea', 620);
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).toHaveBeenCalledExactlyOnceWith('focused-field-off-screen', {
      element: { top: 620, bottom: 660 },
      visible: { top: 0, bottom: KEYBOARD_TOP },
    });
  });

  it('reports a focused input left under the keyboard', () => {
    const area = visibleArea(KEYBOARD_TOP);
    watchScreenPlacement({ visualViewport: area, document }, report);

    focusFieldAt('input', 620);
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).toHaveBeenCalledWith('focused-field-off-screen', expect.anything());
  });

  it('reports nothing for a focused field above the keyboard', () => {
    const area = visibleArea(KEYBOARD_TOP);
    watchScreenPlacement({ visualViewport: area, document }, report);

    focusFieldAt('input', 300);
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).not.toHaveBeenCalled();
  });

  it('ignores a focused element that takes no typing', () => {
    const area = visibleArea(KEYBOARD_TOP);
    watchScreenPlacement({ visualViewport: area, document }, report);
    const button = placedElement('button', 620, 660);
    document.body.append(button);

    button.focus();
    vi.advanceTimersByTime(SETTLE_DELAY_MS);

    expect(report).not.toHaveBeenCalled();
  });
});
