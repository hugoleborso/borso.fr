import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsReducedMotion } from './use-reduced-motion.hook';

type MediaQueryListener = (event: Event) => void;

function changeEvent(): Event {
  return new Event('change');
}

// @FollowsBlueprint test-jsdom-gap-stub
function installMatchMedia(isReducedMotionInitially: boolean): (isReducedMotion: boolean) => void {
  const state = { matches: isReducedMotionInitially };
  const listeners = new Set<MediaQueryListener>();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return state.matches;
      },
      addEventListener: (_eventName: string, listener: MediaQueryListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_eventName: string, listener: MediaQueryListener) => {
        listeners.delete(listener);
      },
    }),
  });

  return (isReducedMotion: boolean) => {
    state.matches = isReducedMotion;
    for (const listener of listeners) {
      listener(changeEvent());
    }
  };
}

// @FollowsBlueprint test-hook-probe
function ReducedMotionReadout() {
  return <output>{String(useIsReducedMotion())}</output>;
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('useIsReducedMotion', () => {
  it('reads the preference on the first render', () => {
    installMatchMedia(true);
    render(<ReducedMotionReadout />);
    expect(screen.getByRole('status').textContent).toBe('true');
  });

  it('re-renders when the reader changes the preference', () => {
    const announce = installMatchMedia(false);
    render(<ReducedMotionReadout />);
    expect(screen.getByRole('status').textContent).toBe('false');

    act(() => {
      announce(true);
    });
    expect(screen.getByRole('status').textContent).toBe('true');
  });
});
