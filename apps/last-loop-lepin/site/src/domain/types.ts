/**
 * DTO mirror of the back-end types. Plain `string` slugs (no TS brands —
 * the construct pattern requires `as Foo` which the repo bans). Validation
 * lives server-side; the front re-displays what the API returns.
 */

export type EditionStatus = 'setup' | 'live' | 'finished';

export interface LatLngDto {
  readonly lat: number;
  readonly lng: number;
}

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
    readonly trackJson: { readonly points: ReadonlyArray<{ readonly lat: number; readonly lng: number }> };
    readonly startLatLng: { readonly lat: number; readonly lng: number };
  };
  readonly status: EditionStatus;
}

export interface RunnerDto {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey: string | null;
  readonly bib: number | null;
}

export interface LoopPunchDto {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: string;
  readonly correctedAt: string | null;
  readonly voidedAt: string | null;
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

export interface StandingsDto {
  readonly editionSlug: string;
  readonly computedAt: string;
  readonly raceEnded: boolean;
  readonly ranked: readonly RankedRunnerDto[];
}
