export type SessionGateState = 'checking' | 'sign-in-required' | 'granted';

// @FollowsBlueprint core-view-intent
export function selectSessionGateState(
  isProbePending: boolean,
  isSignedIn: boolean | undefined,
): SessionGateState {
  if (isSignedIn === undefined) return isProbePending ? 'checking' : 'sign-in-required';
  return isSignedIn ? 'granted' : 'sign-in-required';
}
