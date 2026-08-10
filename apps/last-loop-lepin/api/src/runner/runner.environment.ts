/**
 * Environment reads for the runner slice.
 *
 * `runner.dto.utils.ts` is gated as pure, so it cannot read `process.env`.
 * The mapper takes the CDN host as an argument instead, and the callers get
 * the value from here.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */

/**
 * Read `PHOTOS_CDN_HOST` from the ambient process environment. Returns
 * `undefined` when the variable is unset or empty, and the mapper then yields
 * `photoUrl: null`, so the front end falls back to initials. A development
 * environment with no CDN, and a deployment configured wrongly, both keep
 * serving responses rather than crashing.
 */
export function readPhotosCdnHost(): string | undefined {
  const rawHost = process.env.PHOTOS_CDN_HOST;
  return rawHost === undefined || rawHost === '' ? undefined : rawHost;
}
