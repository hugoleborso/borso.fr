/**
 * @DependsOnExternal google-places
 */

import { type BarSearchHit, mapPlacesToBarSearchHits } from './bar-search.core';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.addressComponents';
const PLACES_API_KEY_VARIABLE = 'GOOGLE_PLACES_API_KEY';
const PLACES_RESULT_LIMIT = 10;

export type PlacesFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface SearchPlacesOptions {
  readonly fetcher?: PlacesFetcher;
  readonly apiKey?: string | undefined;
}

export type BarSearchOutcome =
  { readonly kind: 'ok'; readonly hits: BarSearchHit[] } | { readonly kind: 'not-configured' };

function readApiKey(options: SearchPlacesOptions): string | undefined {
  return options.apiKey ?? process.env[PLACES_API_KEY_VARIABLE];
}

/**
 * @Blueprint adapter-keyed-search-service
 * @BlueprintName Adapter Over A Keyed Search Service
 * @BlueprintUsage Use for the one file in a bounded context that calls a third party needing a credential the deployment supplies.
 * @BlueprintDescription Reads the credential at call time rather than at import, so a Lambda whose variable is set late still works and a test passes its own, and answers a named `not-configured` outcome instead of throwing when the deployment has no key, which is what lets a preview run the feature disabled rather than failing every request. The fetcher is injectable and the vendor's body is handed straight to the sibling `.core.ts`, so this file holds the transport and nothing else.
 * @DependsOnExternal google-places
 */
export async function searchPlacesForBars(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<BarSearchOutcome> {
  const apiKey = readApiKey(options);
  if (apiKey === undefined || apiKey.length === 0) return { kind: 'not-configured' };
  const trimmed = query.trim();
  if (trimmed.length === 0) return { kind: 'ok', hits: [] };
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: trimmed, maxResultCount: PLACES_RESULT_LIMIT }),
  });
  if (!response.ok) return { kind: 'ok', hits: [] };
  const placesBody: unknown = await response.json();
  return { kind: 'ok', hits: mapPlacesToBarSearchHits(placesBody) };
}
