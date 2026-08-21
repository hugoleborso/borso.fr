// @FollowsBlueprint domain-types-module
export type EditionStatus = 'setup' | 'live' | 'finished';

export interface GpxMetadata {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly trackJson: {
    readonly points: readonly { readonly lat: number; readonly lng: number }[];
    readonly pointTimeFractions?: readonly number[];
    readonly pointElevations?: readonly number[];
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
