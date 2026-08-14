/**
 * Tests for `useIsMediaQueryMatching`. jsdom does not implement a real matchMedia
 * — we stub `window.matchMedia` per test to drive the hook through the
 * three states it can be in (matches, doesn't, then flips on change
 * event).
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BREAKPOINT_LG, BREAKPOINT_MD, useIsMediaQueryMatching } from './useIsMediaQueryMatching';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface FakeMediaQueryList {
  matches: boolean;
  addEventListener: (event: 'change', listener: () => void) => void;
  removeEventListener: (event: 'change', listener: () => void) => void;
  _fire: () => void;
}

function setMatchMedia(list: FakeMediaQueryList): void {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => list),
    configurable: true,
    writable: true,
  });
}

function makeFakeMediaQuery(isInitiallyMatching: boolean): FakeMediaQueryList {
  const listeners = new Set<() => void>();
  const list: FakeMediaQueryList = {
    matches: isInitiallyMatching,
    addEventListener: (_event, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_event, listener) => {
      listeners.delete(listener);
    },
    _fire: () => {
      for (const listener of listeners) listener();
    },
  };
  return list;
}

function Probe({ query, sink }: { query: string; sink: (isMatching: boolean) => void }): null {
  const isValue = useIsMediaQueryMatching(query);
  sink(isValue);
  return null;
}

// @FollowsBlueprint test-hook-probe
describe('useIsMediaQueryMatching', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalMatchMedia !== undefined) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    }
  });

  it('returns true when the query matches at mount', () => {
    const list = makeFakeMediaQuery(true);
    setMatchMedia(list);
    let isLast = false;
    act(() => {
      root.render(
        <Probe query="(min-width: 768px)" sink={(isMatching) => (isLast = isMatching)} />,
      );
    });
    expect(isLast).toBe(true);
  });

  it('returns false when the query does not match at mount', () => {
    const list = makeFakeMediaQuery(false);
    setMatchMedia(list);
    let isLast = true;
    act(() => {
      root.render(
        <Probe query="(min-width: 1024px)" sink={(isMatching) => (isLast = isMatching)} />,
      );
    });
    expect(isLast).toBe(false);
  });

  it('re-renders with the new value when the MediaQueryList fires a change event', () => {
    const list = makeFakeMediaQuery(false);
    setMatchMedia(list);
    let isLast = true;
    act(() => {
      root.render(
        <Probe query="(min-width: 768px)" sink={(isMatching) => (isLast = isMatching)} />,
      );
    });
    expect(isLast).toBe(false);

    list.matches = true;
    act(() => {
      list._fire();
    });
    expect(isLast).toBe(true);
  });

  it('exposes the BREAKPOINT_MD and BREAKPOINT_LG named constants', () => {
    expect(BREAKPOINT_MD).toBe('(min-width: 768px)');
    expect(BREAKPOINT_LG).toBe('(min-width: 1024px)');
  });
});
