import { afterEach, describe, expect, it, vi } from 'vitest';
import { showAppBadge } from './app-badge.adapter';

describe('showAppBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('puts the count on the app icon, zero clearing it', async () => {
    const setAppBadge = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { setAppBadge });
    await showAppBadge(3);
    await showAppBadge(0);
    expect(setAppBadge.mock.calls).toEqual([[3], [0]]);
  });

  it('does nothing where the browser has no badge', async () => {
    vi.stubGlobal('navigator', {});
    await expect(showAppBadge(2)).resolves.toBeUndefined();
  });
});
