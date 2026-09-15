import { z } from 'zod';

const CITY_COMPONENT_TYPE = 'locality';
const FALLBACK_CITY_COMPONENT_TYPE = 'postal_town';

const placeSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  addressComponents: z
    .array(z.object({ longText: z.string(), types: z.array(z.string()) }))
    .optional(),
});

const placesResponseSchema = z.object({ places: z.array(placeSchema).optional() });

export interface BarSearchHit {
  readonly placeId: string;
  readonly name: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly phone: string | null;
}

interface PlaceAddressComponent {
  longText: string;
  types: string[];
}

function selectCity(components: readonly PlaceAddressComponent[] | undefined): string | null {
  if (components === undefined) return null;
  const locality = components.find((component) => component.types.includes(CITY_COMPONENT_TYPE));
  if (locality !== undefined) return locality.longText;
  const postalTown = components.find((component) =>
    component.types.includes(FALLBACK_CITY_COMPONENT_TYPE),
  );
  return postalTown === undefined ? null : postalTown.longText;
}

/**
 * @Blueprint core-external-payload-mapping
 * @BlueprintName Core External Payload Mapping
 * @BlueprintUsage Use for turning a third party's response body into this application's own type, so no other file sees the vendor's shape.
 * @BlueprintDescription Parses the body with a Zod schema rather than asserting a type onto it, and answers an empty list for a body that does not match, because a search the vendor answered oddly is not an error the caller can act on. A place with no name is dropped here rather than rendered as a blank row, and the city is read from the address components with a documented fallback, which is the one piece of vendor knowledge this file exists to hold.
 */
export function mapPlacesToBarSearchHits(payload: unknown): BarSearchHit[] {
  const placesBody = placesResponseSchema.safeParse(payload);
  if (!placesBody.success) return [];
  const places = placesBody.data.places ?? [];
  const hits: BarSearchHit[] = [];
  for (const place of places) {
    const name = place.displayName?.text ?? '';
    if (name.length === 0) continue;
    hits.push({
      placeId: place.id,
      name,
      address: place.formattedAddress ?? null,
      city: selectCity(place.addressComponents),
      phone: place.nationalPhoneNumber ?? null,
    });
  }
  return hits;
}
