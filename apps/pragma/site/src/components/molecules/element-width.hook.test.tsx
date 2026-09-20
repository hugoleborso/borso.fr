import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useElementWidth } from './element-width.hook';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const A_FIRST_WIDTH_PX = 120;
const A_SECOND_WIDTH_PX = 64;

const observedElements = new Set<Element>();
const liveObservers = new Set<FakeResizeObserver>();

class FakeResizeObserver implements ResizeObserver {
  private readonly onResize: ResizeObserverCallback;

  constructor(onResize: ResizeObserverCallback) {
    this.onResize = onResize;
  }

  observe(target: Element): void {
    observedElements.add(target);
    liveObservers.add(this);
  }

  unobserve(target: Element): void {
    observedElements.delete(target);
  }

  disconnect(): void {
    liveObservers.delete(this);
    observedElements.clear();
  }

  fire(): void {
    this.onResize([], this);
  }
}

function notifyObservers(): void {
  for (const observer of liveObservers) observer.fire();
}

function widenTo(element: HTMLElement, width: number): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => new DOMRect(0, 0, width, 0),
    configurable: true,
  });
}

function Probe({
  element,
  sink,
}: {
  element: Element | null;
  sink: (width: number) => void;
}): null {
  sink(useElementWidth(element));
  return null;
}

// @FollowsBlueprint test-hook-probe
describe('useElementWidth', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalResizeObserver: PropertyDescriptor | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: FakeResizeObserver,
      configurable: true,
      writable: true,
    });
    observedElements.clear();
    liveObservers.clear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
      return;
    }
    Object.defineProperty(globalThis, 'ResizeObserver', originalResizeObserver);
  });

  it('reports nothing measurable before an element exists', () => {
    const widths: number[] = [];
    act(() => root.render(<Probe element={null} sink={(width) => widths.push(width)} />));
    expect(widths.at(-1)).toBe(0);
    expect(observedElements.size).toBe(0);
  });

  it('reports the width the element already has on the first render', () => {
    const measured = document.createElement('span');
    widenTo(measured, A_FIRST_WIDTH_PX);
    const widths: number[] = [];
    act(() => root.render(<Probe element={measured} sink={(width) => widths.push(width)} />));
    expect(widths.at(-1)).toBe(A_FIRST_WIDTH_PX);
    expect(observedElements.has(measured)).toBe(true);
  });

  it('republishes the width when the observer fires on a change', () => {
    const measured = document.createElement('span');
    widenTo(measured, A_FIRST_WIDTH_PX);
    const widths: number[] = [];
    act(() => root.render(<Probe element={measured} sink={(width) => widths.push(width)} />));
    widenTo(measured, A_SECOND_WIDTH_PX);
    act(() => notifyObservers());
    expect(widths.at(-1)).toBe(A_SECOND_WIDTH_PX);
  });

  it('stays silent when the observer fires and the width did not move', () => {
    const measured = document.createElement('span');
    widenTo(measured, A_FIRST_WIDTH_PX);
    const widths: number[] = [];
    act(() => root.render(<Probe element={measured} sink={(width) => widths.push(width)} />));
    const rendersSoFar = widths.length;
    act(() => notifyObservers());
    expect(widths).toHaveLength(rendersSoFar);
  });

  it('stops observing once the last reader goes away', () => {
    const measured = document.createElement('span');
    widenTo(measured, A_FIRST_WIDTH_PX);
    act(() => root.render(<Probe element={measured} sink={() => undefined} />));
    act(() => root.render(<span />));
    expect(observedElements.size).toBe(0);
  });
});
