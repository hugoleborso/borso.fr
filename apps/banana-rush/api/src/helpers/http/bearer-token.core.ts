const BEARER_PREFIX = 'bearer ';

/**
 * @Blueprint core-reading-a-credential-off-a-standard-header
 * @BlueprintName Core Reading A Credential Off A Standard Header
 * @BlueprintUsage Use for pulling a token out of `Authorization`, in place of inventing a header of the application's own.
 * @BlueprintDescription Reads the credential off the one header every gateway already lets through. A header this application made up is not on any preflight allow list, so a browser silently refuses to send it across origins and the request never leaves the page, which looks like a server that answered nothing rather than a request that was never made. The scheme is compared in lower case because the specification does not fix its case, and an absent or malformed value answers `null` rather than throwing, so the caller decides what a missing credential means. Trimming the whole value before the scheme is matched is what makes a scheme with no token indistinguishable from another scheme: `Bearer` alone no longer carries the trailing space the prefix requires, so it is refused there and the remainder can never come back empty.
 */
export function readBearerToken(headerValue: string | undefined): string | null {
  if (headerValue === undefined) return null;
  const offered = headerValue.trim();
  if (!offered.toLowerCase().startsWith(BEARER_PREFIX)) return null;
  return offered.slice(BEARER_PREFIX.length).trim();
}
