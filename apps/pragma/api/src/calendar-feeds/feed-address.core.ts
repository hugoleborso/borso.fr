const WEBCAL_SCHEME = 'webcal:';
const HTTPS_SCHEME = 'https:';
const HTTPS_DEFAULT_PORT = '';
const LOCALHOST = 'localhost';
const LOCALHOST_SUFFIX = '.localhost';
const IPV4_LITERAL_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_LITERAL_PATTERN = /^\[.*\]$/;
const HOSTNAME_LABEL_SEPARATOR = '.';

export type FeedAddressVerdict =
  { readonly kind: 'accepted'; readonly address: string } | { readonly kind: 'rejected' };

function parseAddress(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

function isPublicHostname(hostname: string): boolean {
  if (hostname === LOCALHOST || hostname.endsWith(LOCALHOST_SUFFIX)) return false;
  if (IPV4_LITERAL_PATTERN.test(hostname) || IPV6_LITERAL_PATTERN.test(hostname)) return false;
  return hostname.includes(HOSTNAME_LABEL_SEPARATOR);
}

// @FollowsBlueprint core-decision
export function judgeFeedAddress(raw: string): FeedAddressVerdict {
  const url = parseAddress(raw);
  if (url === null) return { kind: 'rejected' };
  if (url.protocol === WEBCAL_SCHEME) {
    return judgeFeedAddress(`${HTTPS_SCHEME}${raw.trim().slice(WEBCAL_SCHEME.length)}`);
  }
  if (url.protocol !== HTTPS_SCHEME) return { kind: 'rejected' };
  if (url.port !== HTTPS_DEFAULT_PORT) return { kind: 'rejected' };
  if (url.username !== '' || url.password !== '') return { kind: 'rejected' };
  if (!isPublicHostname(url.hostname)) return { kind: 'rejected' };
  return { kind: 'accepted', address: url.toString() };
}
