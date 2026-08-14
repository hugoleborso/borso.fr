/**
 * Pure rules for the admin auth bounded context: which HTTP status a
 * denial maps to, whether a request's `Origin` header disqualifies it, and
 * which address an `x-forwarded-for` header names.
 */

export type AuthDenialReason = 'rate-limited' | 'invalid-pin' | 'misconfigured';

/**
 * @Blueprint core-lookup-table
 * @BlueprintName Core Lookup Table
 * @BlueprintUsage Use for a total mapping from a domain union onto values, so a new case is a type error rather than a missing branch.
 * @BlueprintDescription Freezes the mapping as one `as const` record and reads it through a total function whose return type is derived from the table, so adding a reason without a status fails to compile and the function itself holds no condition.
 */
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
// @FollowsBlueprint core-decision
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

const FORWARDED_FOR_SEPARATOR = ',';
const SEPARATOR_ABSENT_INDEX = -1;
const UNKNOWN_CLIENT_IP = 'unknown';

/**
 * The client address an `x-forwarded-for` header names. Each proxy appends
 * its own hop to the right of the list, so the leftmost entry is the
 * caller. Answers `unknown` when the header is absent, which the rate
 * limiter then treats as one shared bucket rather than skipping the check.
 */
export function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined) return UNKNOWN_CLIENT_IP;
  const separatorIndex = headerValue.indexOf(FORWARDED_FOR_SEPARATOR);
  if (separatorIndex === SEPARATOR_ABSENT_INDEX) return headerValue.trim();
  return headerValue.slice(0, separatorIndex).trim();
}
