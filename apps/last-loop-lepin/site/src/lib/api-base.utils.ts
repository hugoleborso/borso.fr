/**
 * Pure helpers that turn the build time `VITE_API_BASE` value into the two
 * strings the API layer needs: the prefix for a direct navigation link, and
 * the origin the Hono client is built on.
 *
 * The base is empty in production and in local development, where the API
 * sits on the same origin as the site, and it carries the per pull request
 * API host name on a preview, where the two are on different origins.
 */

const TRAILING_SLASH = /\/$/;
const SAME_ORIGIN = '/';

/** Normalise the raw environment value into a base with no trailing slash. */
// @FollowsBlueprint utils-pure-module
export function selectApiBase(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.replace(TRAILING_SLASH, '');
}

/** The origin the Hono client is built on, which is `/` when same origin. */
export function composeApiOrigin(apiBase: string): string {
  if (apiBase === '') return SAME_ORIGIN;
  return apiBase;
}

/** Prefix a path with the API base, for an anchor or a download link. */
export function composeApiUrl(apiBase: string, pathname: string): string {
  return `${apiBase}${pathname}`;
}
