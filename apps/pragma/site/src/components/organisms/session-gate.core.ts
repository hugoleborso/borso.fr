/**
 * What the route guard should render, given what the browser remembers
 * and what the session probe has answered so far.
 *
 * A browser that has never signed in goes straight to the sign-in
 * screen, so no gated request is sent before the visitor has a session.
 */

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
