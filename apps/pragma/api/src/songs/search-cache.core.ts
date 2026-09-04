const SEARCH_PROVIDER_SEPARATOR = ':';

export type SearchProvider = 'musicbrainz' | 'deezer';

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * @Blueprint core-cache-key-namespaced-by-shape
 * @BlueprintName Cache Key Namespaced By The Shape It Holds
 * @BlueprintUsage Use when one cache table serves several callers whose stored rows do not share a type.
 * @BlueprintDescription Prefixes the key with the name of whatever decides the row's shape, so two callers asking the same question never read each other's answer. Without the prefix the collision is silent rather than loud: a reader parsing the other caller's row with its own schema does not throw, it returns nothing, and the caller shows an empty result for a reason no log records.
 */
export function buildSearchCacheKey(provider: SearchProvider, query: string): string {
  return `${provider}${SEARCH_PROVIDER_SEPARATOR}${normalizeSearchQuery(query)}`;
}
