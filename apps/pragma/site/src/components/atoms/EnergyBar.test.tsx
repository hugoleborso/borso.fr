/**
 * UI test for EnergyBar — which gestures write a level and which write
 * nothing.
 *
 * The pure mapping is covered by `energy-bar.utils.test.ts`; what lives only
 * here is the gesture the bar has to refuse. A vertical swipe that starts on
 * the bar reaches it as a `pointerdown` and two `pointermove`s before the
 * browser rules it a page scroll and sends `pointercancel`, so a bar that
 * writes on the way down rewrites a song nobody was editing. Every case below
 * replays a real event sequence rather than calling a handler.
 */

import { act, type JSX, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyBar } from './EnergyBar';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const MINIMUM = 1;
const MAXIMUM = 10;
const BAR_LEFT = 0;
const BAR_WIDTH = 300;
const BAR_TOP = 100;
const BAR_HEIGHT = 40;
const SEGMENT_WIDTH = BAR_WIDTH / MAXIMUM;
const POINTER_ID = 1;

/** The horizontal centre of a segment, in the client coordinates a pointer carries. */
function centreOf(level: number): number {
  return BAR_LEFT + (level - 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2;
}

const UNMEASURABLE_ATTRIBUTE = 'data-unmeasurable';

/**
 * jsdom lays every element out at zero and implements no pointer capture, and
 * the bar divides by its own measured width, so without these it would refuse
 * every gesture and the suite would pass while proving nothing. An element
 * marked unmeasurable keeps jsdom's own answer, which is what one case needs.
 */
// @FollowsBlueprint test-jsdom-gap-stub
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function measured(this: HTMLElement) {
    if (this.hasAttribute(UNMEASURABLE_ATTRIBUTE)) return new DOMRect(0, 0, 0, 0);
    return new DOMRect(BAR_LEFT, BAR_TOP, BAR_WIDTH, BAR_HEIGHT);
  };
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
});

/**
 * jsdom implements no `PointerEvent` constructor. React reads `pointerId` off
 * whatever native event arrives under a pointer type name, so a `MouseEvent`
 * carrying one is the event the handler receives.
 */
function dispatchPointer(bar: HTMLElement, type: string, clientX: number, clientY: number): void {
  const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
  Object.defineProperty(event, 'pointerId', { value: POINTER_ID });
  act(() => {
    bar.dispatchEvent(event);
  });
}

function dispatchKey(bar: HTMLElement, key: string): void {
  act(() => {
    bar.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
  });
}

/**
 * The bar is controlled, and half of what these cases assert is how it behaves
 * against the value it just reported, so the harness has to feed that value
 * back the way the setlist row does. A fixed `value` prop would leave the bar
 * comparing every move against the level it started from and reporting each
 * one twice.
 */
function ControlledBar({
  initialValue,
  onChange,
}: {
  readonly initialValue: number;
  readonly onChange: (level: number) => void;
}): JSX.Element {
  const [value, setValue] = useState<number>(initialValue);
  return (
    <EnergyBar
      value={value}
      minimum={MINIMUM}
      maximum={MAXIMUM}
      label="Energy"
      filledClassName="filled"
      emptyClassName="empty"
      onChange={(level) => {
        setValue(level);
        onChange(level);
      }}
    />
  );
}

// @FollowsBlueprint test-component-render
describe('EnergyBar', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderBar(value: number, onChange: (level: number) => void): HTMLElement {
    act(() => {
      root.render(<ControlledBar initialValue={value} onChange={onChange} />);
    });
    const bar = container.querySelector('[role="slider"]');
    if (!(bar instanceof HTMLElement)) throw new Error('the bar did not render');
    return bar;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('draws one segment per level, filled up to the value', () => {
    const bar = renderBar(4, vi.fn());
    const segments = Array.from(bar.children);
    expect(segments).toHaveLength(MAXIMUM);
    expect(segments.filter((segment) => segment.className.includes('filled'))).toHaveLength(4);
  });

  it('announces the value it draws', () => {
    const bar = renderBar(4, vi.fn());
    expect(bar.getAttribute('aria-valuenow')).toBe('4');
    expect(bar.getAttribute('aria-valuemin')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
  });

  it('writes the tapped level when the finger lifts', () => {
    const onChange = vi.fn();
    const bar = renderBar(3, onChange);
    dispatchPointer(bar, 'pointerdown', centreOf(8), BAR_TOP + BAR_HEIGHT / 2);
    dispatchPointer(bar, 'pointerup', centreOf(8), BAR_TOP + BAR_HEIGHT / 2);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(8);
  });

  it('writes nothing while the finger is still down', () => {
    const onChange = vi.fn();
    const bar = renderBar(3, onChange);
    dispatchPointer(bar, 'pointerdown', centreOf(8), BAR_TOP + BAR_HEIGHT / 2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes the level a tap lands on even when the bar already draws it', () => {
    const onChange = vi.fn();
    const bar = renderBar(5, onChange);
    dispatchPointer(bar, 'pointerdown', centreOf(5), BAR_TOP + BAR_HEIGHT / 2);
    dispatchPointer(bar, 'pointerup', centreOf(5), BAR_TOP + BAR_HEIGHT / 2);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(5);
  });

  it('writes each level a sideways slide crosses, once', () => {
    const onChange = vi.fn();
    const bar = renderBar(1, onChange);
    dispatchPointer(bar, 'pointerdown', centreOf(1), BAR_TOP + BAR_HEIGHT / 2);
    for (const level of [2, 3, 4]) {
      dispatchPointer(bar, 'pointermove', centreOf(level), BAR_TOP + BAR_HEIGHT / 2);
      dispatchPointer(bar, 'pointermove', centreOf(level), BAR_TOP + BAR_HEIGHT / 2);
    }
    dispatchPointer(bar, 'pointerup', centreOf(4), BAR_TOP + BAR_HEIGHT / 2);
    expect(onChange.mock.calls.flat()).toEqual([2, 3, 4]);
  });

  it('writes nothing when a vertical swipe that started on it becomes a page scroll', () => {
    const onChange = vi.fn();
    const bar = renderBar(10, onChange);
    dispatchPointer(bar, 'pointerdown', centreOf(3), BAR_TOP + BAR_HEIGHT / 2);
    dispatchPointer(bar, 'pointermove', centreOf(3) + 2, BAR_TOP - 20);
    dispatchPointer(bar, 'pointermove', centreOf(3) + 3, BAR_TOP - 60);
    dispatchPointer(bar, 'pointercancel', centreOf(3) + 3, BAR_TOP - 60);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes nothing for a pointer it never captured', () => {
    const onChange = vi.fn();
    const bar = renderBar(10, onChange);
    dispatchPointer(bar, 'pointermove', centreOf(2), BAR_TOP + BAR_HEIGHT / 2);
    dispatchPointer(bar, 'pointerup', centreOf(2), BAR_TOP + BAR_HEIGHT / 2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes nothing when it has no width to locate the pointer in', () => {
    const onChange = vi.fn();
    const bar = renderBar(3, onChange);
    bar.setAttribute(UNMEASURABLE_ATTRIBUTE, '');
    dispatchPointer(bar, 'pointerdown', 0, 0);
    dispatchPointer(bar, 'pointerup', 0, 0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('steps with the arrow keys and jumps with Home and End', () => {
    const onChange = vi.fn();
    const bar = renderBar(5, onChange);
    dispatchKey(bar, 'ArrowRight');
    dispatchKey(bar, 'ArrowLeft');
    dispatchKey(bar, 'Home');
    dispatchKey(bar, 'End');
    expect(onChange.mock.calls.flat()).toEqual([6, 5, MINIMUM, MAXIMUM]);
  });

  it('leaves a key it does not own to the browser', () => {
    const onChange = vi.fn();
    const bar = renderBar(5, onChange);
    dispatchKey(bar, 'Tab');
    expect(onChange).not.toHaveBeenCalled();
  });
});
