/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a `Promise` with an
 * enforced timeout. NOT a hook: this is called from a click handler (the
 * "Je suis là" button), which keeps the geoloc dance off the render tree
 * and avoids a `useEffect` (cf. CLAUDE.md "useEffect is a smell").
 *
 * Resolves with a discriminated result rather than throwing — the FSM that
 * orchestrates the modale switches on `kind`, no try/catch needed there.
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

// `PositionError.PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`.
// Hardcoded so the module doesn't depend on the live `PositionError` global
// at import time (jsdom doesn't expose it; the runtime browser does).
const PERMISSION_DENIED_CODE = 1;
const POSITION_UNAVAILABLE_CODE = 2;
const TIMEOUT_CODE = 3;

/**
 * Ask the browser for the current GPS fix. Times out at 10 s — beyond that
 * the FSM surfaces an explicit "réessayer" so the runner isn't stuck on a
 * spinner. `accuracy` is forwarded as-is; the geofence rule ignores it
 * (cf. spec Q.O.D. Q6).
 */
export function requestPosition(): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined) {
      resolve({ kind: 'unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
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
        if (positionError.code === PERMISSION_DENIED_CODE) {
          resolve({ kind: 'denied' });
          return;
        }
        if (positionError.code === TIMEOUT_CODE) {
          resolve({ kind: 'timeout' });
          return;
        }
        if (positionError.code === POSITION_UNAVAILABLE_CODE) {
          resolve({ kind: 'unavailable' });
          return;
        }
        resolve({ kind: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
