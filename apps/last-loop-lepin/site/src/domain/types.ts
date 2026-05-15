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
    readonly trackJson: {
      readonly points: ReadonlyArray<{ readonly lat: number; readonly lng: number }>;
      /**
       * Cumulative normalised time fractions, one per `points` entry,
       * strictly monotonic from `0` to `1`. Absent when the server-side
       * GPX parser had no per-trkpt timing data — the avatar projection
       * then falls back to the linear time→distance algorithm.
       */
      readonly pointTimeFractions?: ReadonlyArray<number>;
      /**
       * Per-point elevation in meters, one per `points` entry. Absent when
       * the source GPX lacked `<ele>` on any `<trkpt>` — the elevation
       * profile then renders a "Profil indisponible" placeholder.
       */
      readonly pointElevations?: ReadonlyArray<number>;
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
  /**
   * Fully-qualified URL of the runner's photo thumbnail (server-composed
   * from `photoKey` + `PHOTOS_CDN_HOST`). `null` when the runner has no
   * `photoKey` or the CDN host is not configured on the API — the front
   * cascades to the initials avatar in either case. Optional on the wire
   * to absorb the deploy gap between server shipping the field and client
   * reading it; the runtime Zod default coerces `undefined` to `null`, so
   * call sites see `string | null | undefined` and `?? null` at the use
   * site (mirrors the `fastestLap` pattern).
   */
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

export interface StandingsDto {
  readonly editionSlug: string;
  readonly computedAt: string;
  readonly raceEnded: boolean;
  readonly ranked: readonly RankedRunnerDto[];
  /**
   * Edition record-holder(s) for the fastest single loop. Empty when no
   * loop has been closed; length ≥ 2 means a millisecond-tie between
   * distinct runners (every matching chip is decorated by the front).
   */
  readonly fastestLap: ReadonlyArray<{
    readonly runnerSlug: string;
    readonly durationMs: number;
  }>;
}
