import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type DisplayEnvironment,
  isPushSupported,
  NotificationPermissionRefusedError,
  type PushEnvironment,
  readExistingPushSubscription,
  readInstallContext,
  readNotificationPermission,
  subscribeToPush,
} from './push-subscription.adapter';

const SUBSCRIPTION_JSON = {
  endpoint: 'https://push.example/abc',
  keys: { p256dh: 'p', auth: 'a' },
};

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const LINUX = 'Mozilla/5.0 (X11; Linux x86_64)';

const BROWSER_TAB_ON_LINUX: DisplayEnvironment = {
  userAgent: LINUX,
  maxTouchPoints: 0,
  isHomeScreenApp: false,
  matchesStandaloneDisplay: false,
};

function buildEnvironment(
  permission: 'default' | 'granted' | 'denied',
  granted: 'default' | 'granted' | 'denied',
  existing: PushSubscriptionJSON | null,
) {
  const subscribe = vi.fn(() => Promise.resolve({ toJSON: () => SUBSCRIPTION_JSON }));
  const environment: PushEnvironment = {
    notification: { permission, requestPermission: () => Promise.resolve(granted) },
    serviceWorkerReady: () =>
      Promise.resolve({
        pushManager: {
          getSubscription: () =>
            Promise.resolve(existing === null ? null : { toJSON: () => existing }),
          subscribe,
        },
      }),
  };
  return { environment, subscribe };
}

function stubMatchMedia(isMatching: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: isMatching, media: query }));
}

describe('push-subscription.adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports no support and the default permission without a push environment', async () => {
    expect(isPushSupported(null)).toBe(false);
    expect(readNotificationPermission(null)).toBe('default');
    expect(await readExistingPushSubscription(null)).toBeNull();
    const refusal = subscribeToPush('AQ', null);
    await expect(refusal).rejects.toBeInstanceOf(NotificationPermissionRefusedError);
    await expect(refusal).rejects.toMatchObject({
      name: 'NotificationPermissionRefusedError',
      message: 'push unsupported',
    });
  });

  it('reads the permission and the saved subscription from the environment', async () => {
    const { environment } = buildEnvironment('granted', 'granted', SUBSCRIPTION_JSON);
    expect(isPushSupported(environment)).toBe(true);
    expect(readNotificationPermission(environment)).toBe('granted');
    expect(await readExistingPushSubscription(environment)).toEqual(SUBSCRIPTION_JSON);
  });

  it('answers null when the worker holds no subscription', async () => {
    const { environment } = buildEnvironment('default', 'default', null);
    expect(await readExistingPushSubscription(environment)).toBeNull();
  });

  it('subscribes with the decoded key once the permission is granted', async () => {
    const { environment, subscribe } = buildEnvironment('default', 'granted', null);
    expect(await subscribeToPush('AQID', environment)).toEqual(SUBSCRIPTION_JSON);
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
  });

  it('refuses a subscription the browser returned without its keys', async () => {
    const environment: PushEnvironment = {
      notification: { permission: 'default', requestPermission: () => Promise.resolve('granted') },
      serviceWorkerReady: () =>
        Promise.resolve({
          pushManager: {
            getSubscription: () => Promise.resolve(null),
            subscribe: () =>
              Promise.resolve({ toJSON: () => ({ endpoint: 'https://push.example' }) }),
          },
        }),
    };
    await expect(subscribeToPush('AQ', environment)).rejects.toThrow();
  });

  it('refuses to subscribe when the permission is not granted', async () => {
    const { environment, subscribe } = buildEnvironment('default', 'denied', null);
    await expect(subscribeToPush('AQ', environment)).rejects.toThrow('denied');
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('reads the browser itself when no environment is given', () => {
    expect(isPushSupported()).toBe(false);
    expect(readNotificationPermission()).toBe('default');
    const ready = Promise.resolve({});
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    vi.stubGlobal('PushManager', function PushManager() {
      return null;
    });
    vi.stubGlobal('navigator', { serviceWorker: { ready } });
    expect(isPushSupported()).toBe(true);
    expect(readNotificationPermission()).toBe('denied');
  });

  it('waits on the browser worker registration when no environment is given', async () => {
    const getSubscription = vi.fn(() => Promise.resolve(null));
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
    vi.stubGlobal('PushManager', function PushManager() {
      return null;
    });
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription } }) },
    });
    expect(await readExistingPushSubscription()).toBeNull();
    expect(getSubscription).toHaveBeenCalledOnce();
  });

  it('reports no support without the notification API or without a navigator', () => {
    vi.stubGlobal('PushManager', function PushManager() {
      return null;
    });
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({}) } });
    expect(isPushSupported()).toBe(false);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    vi.stubGlobal('navigator', undefined);
    expect(isPushSupported()).toBe(false);
  });

  it('needs every piece of the push stack to report support', () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    expect(isPushSupported()).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(isPushSupported()).toBe(false);
    vi.stubGlobal('navigator', { serviceWorker: {} });
    expect(isPushSupported()).toBe(false);
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
