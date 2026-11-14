const SAME_ORIGIN_BASE = '/';
const TRAILING_SLASH = /\/$/;

// @FollowsBlueprint core-decision
export function selectApiBase(configured: unknown): string {
  if (typeof configured !== 'string' || configured.length === 0) return SAME_ORIGIN_BASE;
  return configured.replace(TRAILING_SLASH, '');
}
