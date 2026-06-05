/**
 * Hashes a client IP for use as the rate-limit bucket key. SHA-256
 * with a per-process salt would be ideal; for now we use the bare
 * SHA-256 — the IP set is small (a handful of NATs) and the threat
 * model treats `ip_hash` as an opaque key for grouping retries, not a
 * privacy guarantee.
 *
 * Lambda receives the client IP from API Gateway as
 * `x-forwarded-for`; the first comma-separated entry is the real
 * client. `readClientIp` extracts it; an empty / undefined header
 * collapses to `'unknown'` so the bucket still has a key.
 */

import { createHash } from 'node:crypto';

export const UNKNOWN_IP_PLACEHOLDER = 'unknown';

export function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined || headerValue.length === 0) return UNKNOWN_IP_PLACEHOLDER;
  const separatorIndex = headerValue.indexOf(',');
  const first = separatorIndex === -1 ? headerValue : headerValue.slice(0, separatorIndex);
  const trimmed = first.trim();
  return trimmed.length === 0 ? UNKNOWN_IP_PLACEHOLDER : trimmed;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}
