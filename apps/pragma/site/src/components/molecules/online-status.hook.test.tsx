import { cleanup, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsOnline } from './online-status.hook';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setNavigatorOnline(isOnline: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  });
}

function OnlineProbe(): JSX.Element {
  return <span data-testid="status">{useIsOnline() ? 'online' : 'offline'}</span>;
}

function readStatus(): string {
  return screen.getByTestId('status').textContent;
}

/**
 * @Blueprint test-hook-probe
 * @BlueprintName Hook Probe Component
 * @BlueprintUsage Use to drive a custom hook from a test without pulling in a hook testing library.
 * @BlueprintDescription Declares a throwaway component in the test file that calls the hook and publishes each returned value into the tree, rendering the list through real elements and the scalar through a test identifier. The test then asserts by querying the rendered output and advances the hook by clicking the button wired to its callback, so it exercises the hook the way a component does. Remount behaviour is covered by rerendering the probe under a different `key`, which is the only way to assert state that resets by remounting rather than by an effect.
 */
describe('useIsOnline', () => {
  afterEach(() => {
    cleanup();
    setNavigatorOnline(true);
  });

  it('reports the browser status at mount', () => {
    setNavigatorOnline(false);
    render(<OnlineProbe />);
    expect(readStatus()).toBe('offline');
  });

  it('re-renders when the browser goes offline and comes back', () => {
    setNavigatorOnline(true);
    render(<OnlineProbe />);
    expect(readStatus()).toBe('online');

    setNavigatorOnline(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(readStatus()).toBe('offline');

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(readStatus()).toBe('online');
  });
});
