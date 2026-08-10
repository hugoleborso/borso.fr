/**
 * Pure rules for the admin auth bounded context: which HTTP status a
 * denial maps to, and whether a request's `Origin` header disqualifies it.
 */

export type AuthDenialReason = 'rate-limited' | 'invalid-pin' | 'misconfigured';

const HTTP_STATUS_BY_DENIAL_REASON = {
  'rate-limited': 429,
  misconfigured: 500,
  'invalid-pin': 401,
} as const;

export type AuthDenialStatus =
  (typeof HTTP_STATUS_BY_DENIAL_REASON)[keyof typeof HTTP_STATUS_BY_DENIAL_REASON];

export function httpStatusForAuthDenial(reason: AuthDenialReason): AuthDenialStatus {
  return HTTP_STATUS_BY_DENIAL_REASON[reason];
}

const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const ALLOWED_ORIGIN_SEPARATOR = ',';

/**
 * The `Origin` header values the API accepts on state-changing requests,
 * read from `ALLOWED_ORIGIN` (set by CDK per stage). `null` means no
 * allow-list is configured, which callers must tell apart from an
 * allow-list that is configured and empty.
 */
export function parseAllowedOrigins(raw: string | undefined): readonly string[] | null {
  if (raw === undefined || raw.length === 0) return null;
  return raw
    .split(ALLOWED_ORIGIN_SEPARATOR)
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * SameSite=Lax on the session cookie covers CSRF via cross-site form
 * submits, but not a scripted request from a malicious origin while a
 * session is live. This check closes that gap on the state-changing
 * methods only, and stays off entirely when no allow-list is configured.
 */
export function isRequestOriginRejected(
  method: string,
  origin: string | undefined,
  allowedOriginRaw: string | undefined,
): boolean {
  if (!STATE_CHANGING_METHODS.has(method)) return false;
  const allowed = parseAllowedOrigins(allowedOriginRaw);
  if (allowed === null) return false;
  return !allowed.some((allowedOrigin) => allowedOrigin === origin);
}
