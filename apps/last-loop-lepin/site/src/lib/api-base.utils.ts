const TRAILING_SLASH = /\/$/;
const SAME_ORIGIN = '/';

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
