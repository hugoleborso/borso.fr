/**
 * Wraps `Geolocation.getCurrentPosition` in a promise with a bounded wait.
 *
 * Not a hook: the runner taps a button and this runs in the handler, which
 * keeps the geolocation dance off the render tree. The browser's `Geolocation`
 * is passed in rather than read from `navigator`, so the function stays pure
 * in its inputs and a test hands it a stand-in.
 *
 * It resolves with a discriminated result rather than throwing, so the state
 * machine that drives the dialog switches on `kind` with no try and catch.
 */

const GEOLOCATION_TIMEOUT_MS = 10_000;

export interface GeoPosition {
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
}

export type PositionResult =
  | { readonly kind: 'ok'; readonly position: GeoPosition }
  | { readonly kind: 'denied' }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'unavailable' };

// `GeolocationPositionError.PERMISSION_DENIED`, `POSITION_UNAVAILABLE` and
// `TIMEOUT`. Written out because jsdom does not expose the global that carries
// them, while the runtime browser does.
const PERMISSION_DENIED_CODE = 1;
const POSITION_UNAVAILABLE_CODE = 2;
const TIMEOUT_CODE = 3;

const RESULT_BY_ERROR_CODE: Readonly<Record<number, PositionResult>> = {
  [PERMISSION_DENIED_CODE]: { kind: 'denied' },
  [POSITION_UNAVAILABLE_CODE]: { kind: 'unavailable' },
  [TIMEOUT_CODE]: { kind: 'timeout' },
};

/**
 * Ask the browser for the current fix, giving up after ten seconds so the
 * runner sees an explicit retry rather than an endless spinner. The accuracy
 * is forwarded as it comes; the geofence rule ignores it.
 */
/**
 * @Blueprint injected-browser-api
 * @BlueprintName Injected Browser API Wrapper
 * @BlueprintUsage Use for wrapping a browser capability that a test has to stand in for, such as geolocation, clipboard, or notifications.
 * @BlueprintDescription The `Geolocation` object arrives as a parameter rather than being read off `navigator`, so a test passes a stand-in object and the module needs no global stub. The promise always resolves with a member of the `PositionResult` union and never rejects, including when the capability is missing, so the caller switches on `kind` with no try and catch; the browser's numeric error codes are mapped through a frozen record with a named fallback.
 */
export function requestPosition(geolocation: Geolocation | undefined): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (geolocation === undefined) {
      resolve({ kind: 'unavailable' });
      return;
    }
    geolocation.getCurrentPosition(
      (geolocationPosition) => {
        resolve({
          kind: 'ok',
          position: {
            lat: geolocationPosition.coords.latitude,
            lng: geolocationPosition.coords.longitude,
            accuracy: geolocationPosition.coords.accuracy,
          },
        });
      },
      (positionError) => {
        resolve(RESULT_BY_ERROR_CODE[positionError.code] ?? { kind: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
