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
/**
 * @Blueprint environment-reader
 * @BlueprintName Environment Reader
 * @BlueprintUsage Use for collecting a slice's `process.env` reads into one module, so its pure files never reach for the environment themselves.
 * @BlueprintDescription Reads the variable and folds both the unset and the empty string cases onto `undefined`, giving the callers a single absent value to pass down to the pure mapper instead of two.
 */
export function readPhotosCdnHost(): string | undefined {
  const rawHost = process.env.PHOTOS_CDN_HOST;
  return rawHost === undefined || rawHost === '' ? undefined : rawHost;
}
