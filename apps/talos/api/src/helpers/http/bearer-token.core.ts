import { readCapture } from '@domain/text.core';

const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)\s*$/i;

// @FollowsBlueprint core-reading-a-credential-off-a-standard-header
export function readBearerToken(header: string): string | null {
  const match = BEARER_PATTERN.exec(header);
  return match === null ? null : readCapture(match, 'token');
}
