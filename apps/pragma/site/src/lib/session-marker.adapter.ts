/**
 * Remembers, in `localStorage`, that this browser has signed in at
 * least once.
 *
 * The session cookie is `httpOnly`, so the front end cannot read it and
 * cannot know whether a request would be accepted. Without a hint, the
 * route guard has to ask the API on every first paint, which answers
 * 401 for every visitor who has not signed in yet. The marker is that
 * hint: no marker means "send the visitor to the sign-in screen and
 * make no request at all", and a marker means "ask, because the cookie
 * may still be valid or may have expired".
 *
 * It is a hint and never an authorisation. Every gated request is still
 * checked by the API against the signed cookie.
 */

const SESSION_MARKER_KEY = 'pragma.session-seen';
const SESSION_MARKER_VALUE = '1';

export function hasSessionMarker(): boolean {
  return localStorage.getItem(SESSION_MARKER_KEY) === SESSION_MARKER_VALUE;
}

export function rememberSessionMarker(): void {
  localStorage.setItem(SESSION_MARKER_KEY, SESSION_MARKER_VALUE);
}

export function forgetSessionMarker(): void {
  localStorage.removeItem(SESSION_MARKER_KEY);
}
