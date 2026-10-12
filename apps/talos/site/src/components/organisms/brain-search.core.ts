export const SEARCH_DEBOUNCE_MS = 250;
const MINIMUM_QUERY_LENGTH = 2;

// @FollowsBlueprint core-view-intent
export function normaliseSearchQuery(rawQuery: string): string {
  return rawQuery.trim();
}

export function isSearchableQuery(query: string): boolean {
  return normaliseSearchQuery(query).length >= MINIMUM_QUERY_LENGTH;
}
