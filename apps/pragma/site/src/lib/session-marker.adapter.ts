/** @DependsOnExternal browser-local-storage */

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
