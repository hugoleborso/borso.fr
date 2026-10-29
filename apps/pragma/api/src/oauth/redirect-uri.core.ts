const HTTPS_PROTOCOL = 'https:';
const HTTP_PROTOCOL = 'http:';
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);
const FRAGMENT_MARKER = '#';

function parseUrlOrNull(candidate: string): URL | null {
  return URL.canParse(candidate) ? new URL(candidate) : null;
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === HTTP_PROTOCOL && LOOPBACK_HOSTS.has(url.hostname);
}

// @FollowsBlueprint core-decision
export function isAcceptedRedirectUri(uri: string): boolean {
  const url = parseUrlOrNull(uri);
  if (url === null) return false;
  if (uri.includes(FRAGMENT_MARKER)) return false;
  if (url.username !== '' || url.password !== '') return false;
  return url.protocol === HTTPS_PROTOCOL || isLoopbackHttp(url);
}

function isSameLoopbackAddressOnAnyPort(requested: URL, registered: string): boolean {
  const registeredUrl = parseUrlOrNull(registered);
  if (registeredUrl === null || !isLoopbackHttp(registeredUrl)) return false;
  return (
    requested.hostname === registeredUrl.hostname &&
    requested.pathname === registeredUrl.pathname &&
    requested.search === registeredUrl.search
  );
}

export function isRegisteredRedirectUri(requested: string, registered: readonly string[]): boolean {
  if (!isAcceptedRedirectUri(requested)) return false;
  if (registered.includes(requested)) return true;
  const requestedUrl = new URL(requested);
  if (!isLoopbackHttp(requestedUrl)) return false;
  return registered.some((candidate) => isSameLoopbackAddressOnAnyPort(requestedUrl, candidate));
}

export function buildRedirectLocation(
  redirectUri: string,
  parameters: Readonly<Record<string, string | undefined>>,
): string {
  const url = new URL(redirectUri);
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined) url.searchParams.set(name, value);
  }
  return url.toString();
}
