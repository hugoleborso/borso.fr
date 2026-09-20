import { createHash } from 'node:crypto';

// @FollowsBlueprint utils-pure-module
export function hashPlayerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
