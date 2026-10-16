import { afterEach, describe, expect, it, vi } from 'vitest';
import { showAppBadge } from './app-badge.adapter';

describe('showAppBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('puts the count on the app icon', () => {
    const setAppBadge = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { setAppBadge });
    showAppBadge(3);
    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it('swallows a refusal, a count of zero clearing the icon', async () => {
    const setAppBadge = vi.fn(() => Promise.reject(new Error('refusé')));
    vi.stubGlobal('navigator', { setAppBadge });
    showAppBadge(0);
    expect(setAppBadge).toHaveBeenCalledWith(0);
    await Promise.resolve();
  });

  it('does nothing where the browser has no badge', () => {
    vi.stubGlobal('navigator', {});
    expect(() => {
      showAppBadge(2);
    }).not.toThrow();
  });
});
