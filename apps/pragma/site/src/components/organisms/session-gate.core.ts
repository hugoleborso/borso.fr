/** @Feature auth */

export type SessionGateState = 'checking' | 'sign-in-required' | 'granted';

// @FollowsBlueprint core-view-intent
export function selectSessionGateState(
  hasMarker: boolean,
  isProbePending: boolean,
  isProbeAuthenticated: boolean | undefined,
): SessionGateState {
  if (!hasMarker) return 'sign-in-required';
  if (isProbeAuthenticated === undefined) {
    return isProbePending ? 'checking' : 'sign-in-required';
  }
  return isProbeAuthenticated ? 'granted' : 'sign-in-required';
}
