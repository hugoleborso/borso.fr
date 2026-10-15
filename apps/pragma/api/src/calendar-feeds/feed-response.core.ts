const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;
const HTTP_MOVED_PERMANENTLY = 301;
const HTTP_FOUND = 302;
const HTTP_SEE_OTHER = 303;
const HTTP_TEMPORARY_REDIRECT = 307;
const HTTP_PERMANENT_REDIRECT = 308;
const HTTP_SUCCESS_FLOOR = 200;
const HTTP_SUCCESS_CEILING = 299;

const STATUSES_MEANING_THE_ADDRESS_IS_GONE: ReadonlySet<number> = new Set([
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_GONE,
]);
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  HTTP_MOVED_PERMANENTLY,
  HTTP_FOUND,
  HTTP_SEE_OTHER,
  HTTP_TEMPORARY_REDIRECT,
  HTTP_PERMANENT_REDIRECT,
]);

export type FeedStatusClass = 'readable' | 'redirect' | 'gone' | 'failed';

// @FollowsBlueprint core-decision
export function classifyFeedStatus(status: number): FeedStatusClass {
  if (REDIRECT_STATUSES.has(status)) return 'redirect';
  if (STATUSES_MEANING_THE_ADDRESS_IS_GONE.has(status)) return 'gone';
  if (status >= HTTP_SUCCESS_FLOOR && status <= HTTP_SUCCESS_CEILING) return 'readable';
  return 'failed';
}

export function isOverSizeLimit(receivedBytes: number, maxBytes: number): boolean {
  return receivedBytes > maxBytes;
}
