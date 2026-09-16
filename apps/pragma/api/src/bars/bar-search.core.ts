import { z } from 'zod';

const CITY_KEYS = ['city', 'town', 'village', 'municipality'] as const;
const PHONE_KEYS = ['phone', 'contact:phone'] as const;

const nominatimPlaceSchema = z.object({
  place_id: z.number(),
  display_name: z.string(),
  name: z.string().optional(),
  address: z.record(z.string(), z.string()).optional(),
  extratags: z.record(z.string(), z.string()).nullish(),
});

const nominatimResponseSchema = z.array(nominatimPlaceSchema);

export interface BarSearchHit {
  readonly placeId: string;
  readonly name: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly phone: string | null;
}

export interface BarSearchCacheEntry {
  readonly value: BarSearchHit[];
  readonly expiresAt: number;
}

export function expiredBarSearchCacheKeys(
  cache: ReadonlyMap<string, BarSearchCacheEntry>,
  nowMillis: number,
): readonly string[] {
  return [...cache]
    .filter(([, entry]) => entry.expiresAt <= nowMillis)
    .map(([cacheKey]) => cacheKey);
}

function selectCity(address: Readonly<Record<string, string>> | undefined): string | null {
  if (address === undefined) return null;
  for (const key of CITY_KEYS) {
    const named = address[key];
    if (named !== undefined) return named;
  }
  return null;
}

function selectPhone(
  extratags: Readonly<Record<string, string>> | null | undefined,
): string | null {
  if (extratags === null || extratags === undefined) return null;
  for (const key of PHONE_KEYS) {
    const tagged = extratags[key];
    if (tagged !== undefined) return tagged;
  }
  return null;
}

/**
 * @Blueprint core-external-payload-mapping
 * @BlueprintName Core External Payload Mapping
 * @BlueprintUsage Use for turning a third party's response body into this application's own type, so no other file sees the vendor's shape.
 * @BlueprintDescription Parses the body with a Zod schema rather than asserting a type onto it, and answers an empty list for a body that does not match, because a search the vendor answered oddly is not an error the caller can act on. A place with no name is dropped here rather than rendered as a blank row, and the city and the phone number are read from the loose tag maps OpenStreetMap carries, with the key order that reads as a fallback chain — which is the one piece of vendor knowledge this file exists to hold.
 */
export function mapNominatimToBarSearchHits(payload: unknown): BarSearchHit[] {
  const places = nominatimResponseSchema.safeParse(payload);
  if (!places.success) return [];
  const hits: BarSearchHit[] = [];
  for (const place of places.data) {
    const name = place.name ?? '';
    if (name.length === 0) continue;
    hits.push({
      placeId: String(place.place_id),
      name,
      address: place.display_name,
      city: selectCity(place.address),
      phone: selectPhone(place.extratags),
    });
  }
  return hits;
}
