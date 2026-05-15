/**
 * Edition (one race day) — domain types.
 *
 * Slugs are plain strings; validation lives in `edition.schema.ts` (Zod).
 * Brand types were considered and dropped: constructing a branded primitive
 * in TypeScript requires `as Foo`, which the repo's Grit plugin bans.
 */

export type EditionStatus = 'setup' | 'live' | 'finished';

export interface GpxMetadata {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly trackJson: {
    readonly points: ReadonlyArray<{ readonly lat: number; readonly lng: number }>;
    /**
     * Cumulative normalised time fractions, one per `points` entry,
     * strictly monotonic from `0` to `1`. Optional — absent (omitted JSON
     * key) when the source GPX lacked per-`<trkpt>` `<time>` data, which
     * triggers the silent linear-projection fallback on the front.
     */
    readonly pointTimeFractions?: ReadonlyArray<number>;
    /**
     * Per-point elevation in meters, one per `points` entry. Optional —
     * absent when the source GPX lacked `<ele>` on any `<trkpt>`. Drives
     * the under-map elevation profile on the spectator page; absent ⇒
     * placeholder "Profil indisponible".
     */
    readonly pointElevations?: ReadonlyArray<number>;
  };
  readonly startLatLng: { readonly lat: number; readonly lng: number };
}

export interface RaceEdition {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly sunriseAt: Date;
  readonly sunsetAt: Date;
  readonly intervalMinutes: number;
  readonly gpx: GpxMetadata;
  readonly status: EditionStatus;
}
