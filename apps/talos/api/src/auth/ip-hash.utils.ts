import { createHash } from 'node:crypto';

export const UNKNOWN_IP_PLACEHOLDER = 'unknown';

// @FollowsBlueprint utils-pure-module
export function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined) return UNKNOWN_IP_PLACEHOLDER;
  const separatorIndex = headerValue.indexOf(',');
  const first = separatorIndex === -1 ? headerValue : headerValue.slice(0, separatorIndex);
  const trimmed = first.trim();
  return trimmed.length === 0 ? UNKNOWN_IP_PLACEHOLDER : trimmed;
}

export function hashIp(ipAddress: string): string {
  return createHash('sha256').update(ipAddress).digest('hex');
}
