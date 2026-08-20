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
