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

/**
 * Read `PHOTOS_CDN_HOST` from the ambient process env. Returns
 * `undefined` when the env var is unset or empty — the mapper then
 * yields `photoUrl: null`, and the front cascades to initials. This
 * keeps dev environments (no CDN) and misconfigured deployments from
 * crashing the response.
 */
export function readPhotosCdnHost(): string | undefined {
  const raw = process.env.PHOTOS_CDN_HOST;
  return raw === undefined || raw === '' ? undefined : raw;
}
