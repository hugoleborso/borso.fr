/**
 * Pure classifier mirroring the rule in `public/sw.js`. The service
 * worker itself is plain JS (it runs in the SW global scope, not the
 * Vite bundle), so the rule is duplicated here as the testable
 * source-of-truth and inlined in `sw.js`. A divergence is caught by
 * the test in this folder (and by reading both definitions side by
 * side during code review).
 */

const SONG_DETAIL_PATTERN = /^\/api\/songs\/[\w-]+$/;
const SESSION_DETAIL_PATTERN = /^\/api\/sessions\/[\w-]+$/;
const SETLIST_BY_SESSION_PATTERN = /^\/api\/setlists\/by-session\/[\w-]+$/;
const SETLIST_ENTRIES_PATTERN = /^\/api\/setlists\/[\w-]+\/entries$/;

const EXACT_CACHEABLE_PATHS = new Set<string>([
  '/api/songs',
  '/api/sessions',
  '/api/instruments',
  '/api/members',
]);

export function isReadableApiPath(pathname: string): boolean {
  if (EXACT_CACHEABLE_PATHS.has(pathname)) return true;
  if (SONG_DETAIL_PATTERN.test(pathname)) return true;
  if (SESSION_DETAIL_PATTERN.test(pathname)) return true;
  if (SETLIST_BY_SESSION_PATTERN.test(pathname)) return true;
  if (SETLIST_ENTRIES_PATTERN.test(pathname)) return true;
  return false;
}
