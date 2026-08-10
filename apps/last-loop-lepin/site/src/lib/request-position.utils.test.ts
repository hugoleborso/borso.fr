import { describe, expect, it } from 'vitest';
import { requestPosition } from './request-position.utils';

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (positionError: GeolocationPositionError) => void;

function buildGeolocation(
  getCurrentPosition: (success: SuccessCallback, error: ErrorCallback) => void,
): Geolocation {
  return {
    getCurrentPosition,
    watchPosition: () => 0,
    clearWatch: () => undefined,
  };
}

function buildFailing(code: number): Geolocation {
  return buildGeolocation((_success, errorCallback) => {
    errorCallback({
      code,
      message: 'failed',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
  });
}

// @FollowsBlueprint test-pure-unit
describe('requestPosition', () => {
  it('resolves with the position when the browser answers', async () => {
    const geolocation = buildGeolocation((success) => {
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
    });
    await expect(requestPosition(geolocation)).resolves.toEqual({
      kind: 'ok',
      position: { lat: 45.55, lng: 5.78, accuracy: 8 },
    });
  });

  it('asks for the high-accuracy fix the geofence needs, with no cached position', () => {
    // A cached or low-accuracy fix would be compared against the 100 m
    // geofence, so the options are part of the contract, not a preference.
    let receivedOptions: PositionOptions | undefined;
    const geolocation: Geolocation = {
      getCurrentPosition: (_success, _error, options) => {
        receivedOptions = options;
      },
      watchPosition: () => 0,
      clearWatch: () => undefined,
    };
    void requestPosition(geolocation);
    expect(receivedOptions).toEqual({
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });

  it('reports a refused permission', async () => {
    await expect(requestPosition(buildFailing(1))).resolves.toEqual({ kind: 'denied' });
  });

  it('reports a position the device could not determine', async () => {
    await expect(requestPosition(buildFailing(2))).resolves.toEqual({ kind: 'unavailable' });
  });

  it('reports a timeout', async () => {
    await expect(requestPosition(buildFailing(3))).resolves.toEqual({ kind: 'timeout' });
  });

  it('reports an unknown error code as unavailable', async () => {
    await expect(requestPosition(buildFailing(99))).resolves.toEqual({ kind: 'unavailable' });
  });

  it('reports a browser with no geolocation as unavailable', async () => {
    await expect(requestPosition(undefined)).resolves.toEqual({ kind: 'unavailable' });
  });
});
