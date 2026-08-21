export type EditionStatus = 'setup' | 'live' | 'finished';

export interface LatLngDto {
  readonly lat: number;
  readonly lng: number;
}

/**
 * @Blueprint domain-types-module
 * @BlueprintName Domain Types Module
 * @BlueprintUsage Use for the shapes a front end reads off its API, when those shapes are shared by several components.
 * @BlueprintDescription Every field is `readonly` and every collection a `readonly T[]`, so a component cannot write into a response it was handed. Slugs stay plain `string` rather than branded types, because a brand needs a type assertion and this repository bans them, and the header records that decision along with why a field is optional on the wire. Validation stays on the server; these interfaces only describe what comes back.
 */
export interface RaceEditionDto {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly sunriseAt: string;
  readonly sunsetAt: string;
  readonly intervalMinutes: number;
  readonly gpx: {
    readonly distanceMeters: number;
    readonly elevationGainMeters: number;
    readonly trackJson: {
      readonly points: readonly { readonly lat: number; readonly lng: number }[];
      readonly pointTimeFractions?: readonly number[];
      readonly pointElevations?: readonly number[];
    };
    readonly startLatLng: { readonly lat: number; readonly lng: number };
  };
  readonly status: EditionStatus;
}

export interface RunnerDto {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey: string | null;
  readonly photoUrl?: string | null;
  readonly bib: number | null;
}

export type PunchSourceDto = 'admin' | 'self';

export interface LoopPunchDto {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: string;
  readonly correctedAt: string | null;
  readonly voidedAt: string | null;
  readonly source: PunchSourceDto;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
  readonly distanceFromCenterM: number | null;
  readonly userAgent: string | null;
}

export type RunnerStatusDto =
  | { readonly kind: 'in-race'; readonly lastLoop: number }
  | { readonly kind: 'dnf'; readonly outAtLoop: number; readonly reason: 'late' | 'manual' };

export interface RankedRunnerDto {
  readonly runner: RunnerDto;
  readonly rank: number | 'ex-aequo';
  readonly status: RunnerStatusDto;
  readonly lastLoopDurationMs: number | null;
  readonly lastFinishedAt: string | null;
}
