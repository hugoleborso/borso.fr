import { describe, expect, it } from 'vitest';
import {
  type InstallOfferDevice,
  installStepsOf,
  isInstallAccepted,
  isNativeInstallOffered,
  selectInstallWalkthrough,
} from './install-offer.utils';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_EDGE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) EdgiOS/130.0';
const IPHONE_OPERA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) OPiOS/16.0';
const IPHONE_GOOGLE_APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) GSA/340.0';
const IPHONE_DUCKDUCKGO =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 DuckDuckGo/7';
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DESKTOP_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DESKTOP_CHROME_ON_IOS_LOOKALIKE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CriOS/130.0';

const PHONE_TOUCH_POINTS = 5;

function deviceOf(userAgent: string, overrides: Partial<InstallOfferDevice> = {}) {
  return {
    userAgent,
    maxTouchPoints: PHONE_TOUCH_POINTS,
    isStandalone: false,
    isDismissed: false,
    ...overrides,
  };
}

describe('selectInstallWalkthrough', () => {
  it('offers the Safari walkthrough to Safari on an iPhone and on an iPad posing as a Mac', () => {
    expect(selectInstallWalkthrough(deviceOf(IPHONE_SAFARI))).toBe('ios-safari');
    expect(selectInstallWalkthrough(deviceOf(IPAD_AS_MAC))).toBe('ios-safari');
  });

  it('offers the open-in-Safari walkthrough to every other iOS browser', () => {
    const otherBrowsers = [
      IPHONE_CHROME,
      IPHONE_FIREFOX,
      IPHONE_EDGE,
      IPHONE_OPERA,
      IPHONE_GOOGLE_APP,
      IPHONE_DUCKDUCKGO,
    ];
    for (const userAgent of otherBrowsers) {
      expect(selectInstallWalkthrough(deviceOf(userAgent))).toBe('ios-other-browser');
    }
  });

  it('offers the Android walkthrough to an Android phone and an Android tablet', () => {
    expect(selectInstallWalkthrough(deviceOf(ANDROID_CHROME))).toBe('android');
    expect(selectInstallWalkthrough(deviceOf(ANDROID_TABLET))).toBe('android');
  });

  it('offers nothing to a desktop browser, even with a touch screen', () => {
    expect(selectInstallWalkthrough(deviceOf(DESKTOP_CHROME))).toBeNull();
    expect(selectInstallWalkthrough(deviceOf(DESKTOP_CHROME, { maxTouchPoints: 0 }))).toBeNull();
    expect(selectInstallWalkthrough(deviceOf(DESKTOP_CHROME_ON_IOS_LOOKALIKE))).toBeNull();
  });

  it('offers nothing to a Mac without touch, which is a desktop and not an iPad', () => {
    expect(selectInstallWalkthrough(deviceOf(IPAD_AS_MAC, { maxTouchPoints: 0 }))).toBeNull();
  });

  it('offers nothing once pragma runs installed, on either platform', () => {
    expect(selectInstallWalkthrough(deviceOf(IPHONE_SAFARI, { isStandalone: true }))).toBeNull();
    expect(selectInstallWalkthrough(deviceOf(ANDROID_CHROME, { isStandalone: true }))).toBeNull();
  });

  it('offers nothing once the member dismissed the banner on this device', () => {
    expect(selectInstallWalkthrough(deviceOf(IPHONE_SAFARI, { isDismissed: true }))).toBeNull();
    expect(selectInstallWalkthrough(deviceOf(ANDROID_CHROME, { isDismissed: true }))).toBeNull();
  });
});

describe('installStepsOf', () => {
  it('walks Safari through Share, the scroll, Add to Home Screen and Add', () => {
    expect(installStepsOf('ios-safari')).toEqual([
      'tap-share',
      'scroll-share-sheet',
      'tap-add-to-home-screen',
      'confirm-add',
    ]);
  });

  it('starts another iOS browser with opening the page in Safari', () => {
    expect(installStepsOf('ios-other-browser')).toEqual([
      'open-in-safari',
      'tap-share',
      'scroll-share-sheet',
      'tap-add-to-home-screen',
      'confirm-add',
    ]);
  });

  it('walks Android through the menu, Install app and Install', () => {
    expect(installStepsOf('android')).toEqual([
      'tap-browser-menu',
      'tap-install-app',
      'confirm-install',
    ]);
  });
});

describe('isNativeInstallOffered', () => {
  it('offers the real install button on Android once the browser deferred its prompt', () => {
    expect(isNativeInstallOffered('android', true)).toBe(true);
    expect(isNativeInstallOffered('android', false)).toBe(false);
  });

  it('never offers it on iOS, which has no install prompt', () => {
    expect(isNativeInstallOffered('ios-safari', true)).toBe(false);
    expect(isNativeInstallOffered('ios-other-browser', true)).toBe(false);
  });
});

describe('isInstallAccepted', () => {
  it('reads only an accepted choice as an installation', () => {
    expect(isInstallAccepted('accepted')).toBe(true);
    expect(isInstallAccepted('dismissed')).toBe(false);
  });
});
