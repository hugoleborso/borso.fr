import { describe, expect, it } from 'vitest';
import {
  isIosDevice,
  selectNotificationOffer,
  shouldShowInstallHint,
} from './notifications-offer.core';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';

describe('selectNotificationOffer', () => {
  it('hides the offer where push does not exist', () => {
    expect(selectNotificationOffer(false, 'granted', true)).toBe('unsupported');
  });

  it('says so when the owner refused the permission', () => {
    expect(selectNotificationOffer(true, 'denied', false)).toBe('denied');
  });

  it('offers to enable until the permission is granted and the subscription saved', () => {
    expect(selectNotificationOffer(true, 'default', false)).toBe('offer');
    expect(selectNotificationOffer(true, 'default', true)).toBe('offer');
    expect(selectNotificationOffer(true, 'granted', false)).toBe('offer');
  });

  it('reports enabled once both hold', () => {
    expect(selectNotificationOffer(true, 'granted', true)).toBe('enabled');
  });
});

describe('isIosDevice', () => {
  it('recognises an iPhone', () => {
    expect(isIosDevice(IPHONE, 5)).toBe(true);
  });

  it('recognises an iPad that announces itself as a Mac by its touch points', () => {
    expect(isIosDevice(MAC, 5)).toBe(true);
    expect(isIosDevice(MAC, 1)).toBe(false);
    expect(isIosDevice(MAC, 0)).toBe(false);
  });

  it('does not mistake a touch Android phone for iOS', () => {
    expect(isIosDevice(ANDROID, 5)).toBe(false);
  });
});

describe('shouldShowInstallHint', () => {
  it('shows the hint on iOS in the browser only', () => {
    expect(shouldShowInstallHint(true, false)).toBe(true);
    expect(shouldShowInstallHint(true, true)).toBe(false);
    expect(shouldShowInstallHint(false, false)).toBe(false);
  });
});
