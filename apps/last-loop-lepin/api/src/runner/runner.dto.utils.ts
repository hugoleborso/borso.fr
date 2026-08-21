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

function composePhotoUrl(photoKey: string | null, cdnHost: string | undefined): string | null {
  if (photoKey === null) return null;
  if (cdnHost === undefined || cdnHost === '') return null;
  const trimmedKey = photoKey.replace(LEADING_SLASHES, '');
  return `https://${cdnHost}/${trimmedKey}`;
}

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
