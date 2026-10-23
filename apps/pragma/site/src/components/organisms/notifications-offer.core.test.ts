import { describe, expect, it } from 'vitest';
import {
  isEnableOffered,
  isIosDevice,
  type NotificationDevice,
  selectEnableFailure,
  selectNotificationOffer,
} from './notifications-offer.core';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPOD = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';

const DESKTOP_DEVICE: NotificationDevice = {
  isPushSupported: true,
  permission: 'default',
  isSubscribed: false,
  isIos: false,
  isStandalone: false,
};

describe('isIosDevice', () => {
  it('recognises an iPhone and an iPod', () => {
    expect(isIosDevice(IPHONE, 5)).toBe(true);
    expect(isIosDevice(IPOD, 0)).toBe(true);
  });

  it('recognises an iPad that announces itself as a Mac by its touch points', () => {
    expect(isIosDevice(MAC, 5)).toBe(true);
    expect(isIosDevice(MAC, 2)).toBe(true);
    expect(isIosDevice(MAC, 1)).toBe(false);
    expect(isIosDevice(MAC, 0)).toBe(false);
  });

  it('does not mistake a touch Android phone for iOS', () => {
    expect(isIosDevice(ANDROID, 5)).toBe(false);
  });
});

describe('selectEnableFailure', () => {
  it('names a refused permission whatever the status', () => {
    expect(selectEnableFailure({ status: 503, isPermissionRefusal: true })).toBe('refused');
  });

  it('names a stage without its VAPID keys by the 503 it answers', () => {
    expect(selectEnableFailure({ status: 503, isPermissionRefusal: false })).toBe('not-configured');
  });

  it('reads any other failure as a plain failure', () => {
    expect(selectEnableFailure({ status: 500, isPermissionRefusal: false })).toBe('failed');
    expect(selectEnableFailure({ status: 502, isPermissionRefusal: false })).toBe('failed');
    expect(selectEnableFailure({ status: null, isPermissionRefusal: false })).toBe('failed');
  });
});

describe('selectNotificationOffer', () => {
  it('asks an iPhone in the browser to install pragma first, even without push support', () => {
    expect(
      selectNotificationOffer({ ...DESKTOP_DEVICE, isIos: true, isPushSupported: false }),
    ).toBe('install');
  });

  it('offers push on an iPhone once pragma is on the home screen', () => {
    expect(selectNotificationOffer({ ...DESKTOP_DEVICE, isIos: true, isStandalone: true })).toBe(
      'offer',
    );
  });

  it('does not ask a desktop to install, even outside a standalone window', () => {
    expect(selectNotificationOffer(DESKTOP_DEVICE)).toBe('offer');
  });

  it('says push is missing where the browser has none', () => {
    expect(
      selectNotificationOffer({
        ...DESKTOP_DEVICE,
        isPushSupported: false,
        permission: 'granted',
        isSubscribed: true,
      }),
    ).toBe('unsupported');
  });

  it('says so when the member refused the permission', () => {
    expect(selectNotificationOffer({ ...DESKTOP_DEVICE, permission: 'denied' })).toBe('denied');
  });

  it('offers to enable until the permission is granted and the subscription saved', () => {
    expect(selectNotificationOffer({ ...DESKTOP_DEVICE, isSubscribed: true })).toBe('offer');
    expect(selectNotificationOffer({ ...DESKTOP_DEVICE, permission: 'granted' })).toBe('offer');
  });

  it('reports enabled once both hold', () => {
    expect(
      selectNotificationOffer({ ...DESKTOP_DEVICE, permission: 'granted', isSubscribed: true }),
    ).toBe('enabled');
  });
});

describe('isEnableOffered', () => {
  it('shows the Enable button only while push can still be turned on', () => {
    expect(isEnableOffered('offer')).toBe(true);
    expect(isEnableOffered('enabled')).toBe(false);
    expect(isEnableOffered('install')).toBe(false);
    expect(isEnableOffered('denied')).toBe(false);
    expect(isEnableOffered('unsupported')).toBe(false);
  });
});
