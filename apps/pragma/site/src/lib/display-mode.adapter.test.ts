import { afterEach, describe, expect, it, vi } from 'vitest';
import { type DisplayEnvironment, readInstallContext } from './display-mode.adapter';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const LINUX = 'Mozilla/5.0 (X11; Linux x86_64)';

const BROWSER_TAB_ON_LINUX: DisplayEnvironment = {
  userAgent: LINUX,
  maxTouchPoints: 0,
  isHomeScreenApp: false,
  matchesStandaloneDisplay: false,
};

function stubMatchMedia(isMatching: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: isMatching, media: query }));
}

describe('display-mode.adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads an iPhone browser tab as iOS and not installed', () => {
    expect(readInstallContext({ ...BROWSER_TAB_ON_LINUX, userAgent: IPHONE })).toEqual({
      isIos: true,
      isStandalone: false,
    });
    expect(readInstallContext(BROWSER_TAB_ON_LINUX)).toEqual({
      isIos: false,
      isStandalone: false,
    });
  });

  it('reads either the iOS home screen flag or the standalone display mode as installed', () => {
    expect(
      readInstallContext({ ...BROWSER_TAB_ON_LINUX, isHomeScreenApp: true }).isStandalone,
    ).toBe(true);
    expect(
      readInstallContext({ ...BROWSER_TAB_ON_LINUX, matchesStandaloneDisplay: true }).isStandalone,
    ).toBe(true);
  });

  it('reads the home screen flag and the display mode from the browser', () => {
    stubMatchMedia(false);
    vi.stubGlobal('navigator', { userAgent: IPHONE, maxTouchPoints: 5, standalone: true });
    expect(readInstallContext()).toEqual({ isIos: true, isStandalone: true });
    vi.stubGlobal('navigator', { userAgent: IPHONE, maxTouchPoints: 5, standalone: false });
    expect(readInstallContext()).toEqual({ isIos: true, isStandalone: false });
    vi.stubGlobal('navigator', { userAgent: LINUX, maxTouchPoints: 0 });
    stubMatchMedia(true);
    expect(readInstallContext()).toEqual({ isIos: false, isStandalone: true });
  });
});
