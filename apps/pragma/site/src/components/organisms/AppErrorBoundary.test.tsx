import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { AppErrorBoundary } from './AppErrorBoundary';
import { discardCachesAndReload, reload } from '../../lib/recovery.adapter';

vi.mock('../../lib/recovery.adapter', () => ({
  reload: vi.fn(),
  discardCachesAndReload: vi.fn(),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function ThrowingChild(): JSX.Element {
  throw new Error('the bundle the page was served is not the one it asked for');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders its children while nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>the catalogue</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('the catalogue')).toBeDefined();
  });

  it('replaces a thrown render with a message instead of an empty document', () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeDefined();
  });

  it('offers a plain reload', async () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('offers a reload that first drops what the page is served from', async () => {
    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear the stored copy and reload' }));
    expect(discardCachesAndReload).toHaveBeenCalledTimes(1);
  });
});
