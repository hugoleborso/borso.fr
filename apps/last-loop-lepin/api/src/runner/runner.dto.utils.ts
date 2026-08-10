/**
 * Domain → DTO mapper for `Runner`. Pure, deterministic in
 * `(runner, cdnHost)`. The DTO carries `photoUrl` (composed from
 * `photoKey` + the CDN host) on top of the domain fields so the front
 * can render the runner's photo without knowing the bucket / CDN URL
 * scheme.
 */

import type { Runner } from './runner.types';

export interface RunnerDto {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey: string | null;
  readonly photoUrl: string | null;
  readonly bib: number | null;
}

const LEADING_SLASHES = /^\/+/;

/**
 * Compose the `photoUrl` for a runner. Returns `null` when the runner has
 * no `photoKey` OR when `cdnHost` is not configured (= the API is
 * deployed without `PHOTOS_CDN_HOST`); the front then cascades to the
 * initials avatar in both cases.
 */
function composePhotoUrl(photoKey: string | null, cdnHost: string | undefined): string | null {
  if (photoKey === null) return null;
  if (cdnHost === undefined || cdnHost === '') return null;
  const trimmedKey = photoKey.replace(LEADING_SLASHES, '');
  return `https://${cdnHost}/${trimmedKey}`;
}

/**
 * Map a domain `Runner` to its DTO. `cdnHost` is the bare hostname (no
 * scheme, no path) of the photos CDN — typically read from the
 * `PHOTOS_CDN_HOST` env var by the caller.
 */
/**
 * @Blueprint dto-mapper
 * @BlueprintName DTO Mapper
 * @BlueprintUsage Use for turning a domain object into the shape the front end receives, keeping the mapper pure so it carries the full coverage gate.
 * @BlueprintDescription Takes the CDN host as a parameter rather than reading `PHOTOS_CDN_HOST` itself, so the composed `photoUrl` and its two null cases, no photo key and no host configured, are each one call in a test with no environment stubbing.
 */
export function toRunnerDto(runner: Runner, cdnHost: string | undefined): RunnerDto {
  return {
    editionSlug: runner.editionSlug,
    slug: runner.slug,
    displayName: runner.displayName,
    photoKey: runner.photoKey,
    photoUrl: composePhotoUrl(runner.photoKey, cdnHost),
    bib: runner.bib,
  };
}
