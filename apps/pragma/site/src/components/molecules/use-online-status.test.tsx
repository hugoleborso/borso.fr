/**
 * Behaviour test for `useIsOnline`, which replaced the AppShell effect
 * that copied `navigator.onLine` into React state. The hook has to
 * report the browser's status at mount and re-render on the `online`
 * and `offline` events.
 */

import { cleanup, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIsOnline } from './useOnlineStatus';

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
