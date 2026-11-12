const TRAILING_SLASH = /\/$/;
const SAME_ORIGIN = '/';
const API_PATH_PREFIX = '/api/';
const REGULAR_EXPRESSION_SYNTAX = /[.*+?^${}()|[\]\\/]/g;

// @FollowsBlueprint utils-pure-module
export function selectApiBase(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.replace(TRAILING_SLASH, '');
}

export function composeApiOrigin(apiBase: string): string {
  if (apiBase === '') return SAME_ORIGIN;
  return apiBase;
}

export function composeApiUrl(apiBase: string, pathname: string): string {
  return `${apiBase}${pathname}`;
}

function escapeForRegularExpression(text: string): string {
  return text.replace(REGULAR_EXPRESSION_SYNTAX, '\\$&');
}

export function composeApiTraceTarget(apiBase: string, pageOrigin: string): RegExp {
  const apiOrigin = apiBase === '' ? pageOrigin : apiBase;
  return new RegExp(`^${escapeForRegularExpression(`${apiOrigin}${API_PATH_PREFIX}`)}`);
}
