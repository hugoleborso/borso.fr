import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './long-press.hook';

const LONG_PRESS_MS = 500;

function PressProbe({ onLongPress }: { readonly onLongPress: () => void }): JSX.Element {
  const handlers = useLongPress(onLongPress);
  return (
    <button type="button" data-testid="target" {...handlers}>
      press me
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderProbe(): {
  readonly onLongPress: ReturnType<typeof vi.fn>;
  readonly target: HTMLElement;
} {
  const onLongPress = vi.fn();
  render(<PressProbe onLongPress={onLongPress} />);
  return { onLongPress, target: screen.getByTestId('target') };
}

describe('useLongPress', () => {
  it('fires once the press has been held long enough', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire on a press released before the delay', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    fireEvent.pointerUp(target);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('abandons the press when the pointer leaves', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    fireEvent.pointerLeave(target);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('abandons the press when the pointer is cancelled', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    fireEvent.pointerCancel(target);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('abandons the press once the pointer has travelled, which is a drag', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    fireEvent.pointerMove(target, { movementX: 40, movementY: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('keeps the press alive through a jitter smaller than the tolerance', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerDown(target);
    fireEvent.pointerMove(target, { movementX: 2, movementY: 2 });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ignores a move made when no press is pending', () => {
    vi.useFakeTimers();
    const { onLongPress, target } = renderProbe();
    fireEvent.pointerMove(target, { movementX: 40, movementY: 0 });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('swallows the click a long press would otherwise deliver underneath', () => {
    vi.useFakeTimers();
    const { target } = renderProbe();
    fireEvent.pointerDown(target);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('lets a plain tap through as a click', () => {
    vi.useFakeTimers();
    const { target } = renderProbe();
    fireEvent.pointerDown(target);
    fireEvent.pointerUp(target);
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(false);
  });

  it('suppresses the context menu a held press raises on a touch screen', () => {
    const { target } = renderProbe();
    const menuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    target.dispatchEvent(menuEvent);
    expect(menuEvent.defaultPrevented).toBe(true);
  });
});
