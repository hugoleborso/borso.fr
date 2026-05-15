import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPosition } from './requestPosition.utils';

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (positionError: GeolocationPositionError) => void;

interface MockGeolocation {
  readonly getCurrentPosition: (
    success: SuccessCallback,
    error: ErrorCallback,
    options: PositionOptions,
  ) => void;
}

function installNavigatorWithGeolocation(geolocation: MockGeolocation | undefined): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: geolocation === undefined ? {} : { geolocation },
  });
}

function uninstallNavigator(): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: undefined,
  });
}

describe('requestPosition', () => {
  afterEach(() => {
    uninstallNavigator();
    vi.restoreAllMocks();
  });

  it('returns ok with the position when the browser resolves', async () => {
    installNavigatorWithGeolocation({
      getCurrentPosition: (success) => {
        success({
          coords: {
            latitude: 45.55,
            longitude: 5.78,
            accuracy: 8,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: 0,
          toJSON: () => ({}),
        });
      },
    });
    const result = await requestPosition();
    expect(result).toEqual({
      kind: 'ok',
      position: { lat: 45.55, lng: 5.78, accuracy: 8 },
    });
  });

  it('returns denied on PERMISSION_DENIED', async () => {
    installNavigatorWithGeolocation({
      getCurrentPosition: (_success, errorCallback) => {
        errorCallback({
          code: 1,
          message: 'User denied geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    });
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'denied' });
  });

  it('returns timeout on TIMEOUT', async () => {
    installNavigatorWithGeolocation({
      getCurrentPosition: (_success, errorCallback) => {
        errorCallback({
          code: 3,
          message: 'timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    });
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'timeout' });
  });

  it('returns unavailable on POSITION_UNAVAILABLE', async () => {
    installNavigatorWithGeolocation({
      getCurrentPosition: (_success, errorCallback) => {
        errorCallback({
          code: 2,
          message: 'unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    });
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable on an unknown PositionError code', async () => {
    installNavigatorWithGeolocation({
      getCurrentPosition: (_success, errorCallback) => {
        errorCallback({
          code: 99,
          message: 'mystery',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    });
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable when navigator.geolocation is undefined', async () => {
    installNavigatorWithGeolocation(undefined);
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable when navigator itself is undefined', async () => {
    uninstallNavigator();
    const result = await requestPosition();
    expect(result).toEqual({ kind: 'unavailable' });
  });
});
