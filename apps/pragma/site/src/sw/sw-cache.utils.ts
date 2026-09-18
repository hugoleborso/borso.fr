const SONG_DETAIL_PATTERN = /^\/api\/songs\/[\w-]+$/;
const SESSION_DETAIL_PATTERN = /^\/api\/sessions\/[\w-]+$/;
const SETLIST_BY_SESSION_PATTERN = /^\/api\/setlists\/by-session\/[\w-]+$/;
const SETLIST_ENTRIES_PATTERN = /^\/api\/setlists\/[\w-]+\/entries$/;

const EXACT_CACHEABLE_PATHS = new Set<string>([
  '/api/songs',
  '/api/sessions',
  '/api/instruments',
  '/api/members',
  '/api/offline-manifest',
]);

const HTML_CONTENT_TYPE = 'text/html';
const CONTENT_TYPE_PARAMETER_SEPARATOR = ';';

// @FollowsBlueprint utils-pure-module
export function isReadableApiPath(pathname: string): boolean {
  if (EXACT_CACHEABLE_PATHS.has(pathname)) return true;
  if (SONG_DETAIL_PATTERN.test(pathname)) return true;
  if (SESSION_DETAIL_PATTERN.test(pathname)) return true;
  if (SETLIST_BY_SESSION_PATTERN.test(pathname)) return true;
  if (SETLIST_ENTRIES_PATTERN.test(pathname)) return true;
  return false;
}

// @FollowsBlueprint utils-pure-module
export function isHtmlContentType(contentType: string | null): boolean {
  if (contentType === null) return false;
  const separatorIndex = contentType.indexOf(CONTENT_TYPE_PARAMETER_SEPARATOR);
  const mediaType = separatorIndex === -1 ? contentType : contentType.slice(0, separatorIndex);
  return mediaType.trim().toLowerCase() === HTML_CONTENT_TYPE;
}
